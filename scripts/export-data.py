#!/usr/bin/env python3
"""Export data from the legacy Open Beans SQLite database as D1-ready SQL.

Generates INSERT statements with explicit column names (the legacy database
gained columns via ALTER TABLE, so positional dumps are unreliable) and
rewrites image paths from /static/uploads/... to /images/...

Usage:
    python3 scripts/export-data.py path/to/old/db.sqlite > data.sql
    npx wrangler d1 execute open-beans-db --remote --file=data.sql
"""

import sqlite3
import sys

# FK-safe insert order; columns limited to what the new schema defines.
TABLES = {
    "app_settings": ["id", "theme"],
    "tag": ["id", "name"],
    "recipe_template": [
        "id", "name", "tag_id", "position",
        "bean_min", "bean_max", "bean_step", "bean_default",
        "grinder_min", "grinder_max", "grinder_step", "grinder_default",
        "weight_min", "weight_max", "weight_step", "weight_default",
        "brew_min", "brew_max", "brew_step", "brew_default",
    ],
    "bean": ["id", "brand", "name", "image_url", "is_archived", "rating"],
    "recipe": [
        "id", "name", "category", "template_id", "position", "bean_id",
        "grinder_coarseness", "bean_amount", "brew_time", "final_weight",
    ],
}


def sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def main():
    if len(sys.argv) != 2:
        sys.exit("Usage: export-data.py path/to/db.sqlite")

    conn = sqlite3.connect(sys.argv[1])
    conn.row_factory = sqlite3.Row

    for table, columns in TABLES.items():
        existing = {
            row[1] for row in conn.execute(f'PRAGMA table_info("{table}")')
        }
        cols = [c for c in columns if c in existing]
        if not cols:
            continue
        for row in conn.execute(f'SELECT {", ".join(cols)} FROM "{table}"'):
            values = []
            for col in cols:
                value = row[col]
                if table == "bean" and col == "image_url" and value:
                    value = value.replace("/static/uploads/", "/images/")
                values.append(sql_literal(value))
            print(
                f'INSERT INTO "{table}" ({", ".join(cols)}) '
                f'VALUES ({", ".join(values)});'
            )

    conn.close()


if __name__ == "__main__":
    main()
