"""
Build a grouped openings JSON file from the raw ECO data.

Reads ecoA.json through ecoE.json and produces openings.json,
which groups every opening line under its family name using
the same classification logic as pgn_parser.py.

Output format:
{
    "Sicilian Defense": {
        "lines": {
            "Sicilian Defense": {
                "fen": "rnbqkbnr/pp1ppppp/...",
                "eco": "B20",
                "moves": "1. e4 c5"
            },
            "Sicilian Defense: Najdorf Variation": {
                "fen": "rnbqkb1r/1p2pppp/...",
                "eco": "B90",
                "moves": "1. e4 c5 2. Nf3 d6 ..."
            }
        }
    }
}

Usage:
    cd backend/eco
    python build_openings.py
"""

import json
import os

# Same classification rules as pgn_parser.py

TOO_BROAD_FAMILY_NAMES = {
    "King's Pawn Game",
    "Queen's Pawn Game",
    "King's Knight Opening",
}

FAMILY_KEYWORDS = {
    "London": "London System",
}

FAMILY_ALIASES = {
    "QGD": "Queen's Gambit Declined",
    "Queen's Pawn": "Queen's Pawn Game",
}


def get_family(name):
    """Derive the opening family from a full opening name.
    Uses the same logic as classify_opening in pgn_parser.py."""

    # Check keyword overrides first
    for keyword, family_name in FAMILY_KEYWORDS.items():
        if keyword in name:
            return family_name

    # Split on colon then comma to get the base name
    family = name.split(":")[0].split(",")[0].strip()

    # Skip too-broad names — use the full name instead
    # (these will still group under the broad name, but
    # that's correct for the opening browser since there's
    # no match chain to walk like in pgn_parser)

    # Apply aliases
    family = FAMILY_ALIASES.get(family, family)

    return family


def main():
    eco_directory = os.path.dirname(os.path.abspath(__file__))

    # Load all ECO files
    all_entries = {}
    for letter in "ABCDE":
        filepath = os.path.join(eco_directory, f"eco{letter}.json")
        with open(filepath) as f:
            all_entries.update(json.load(f))

    # Group by family
    families = {}
    for fen, entry in all_entries.items():
        name = entry["name"]
        eco = entry.get("eco", "")
        moves = entry.get("moves", "")
        family = get_family(name)

        if family not in families:
            families[family] = {"lines": {}}

        # If a line name appears multiple times (different FENs),
        # keep the one with the longest move sequence (deepest position)
        if name not in families[family]["lines"]:
            families[family]["lines"][name] = {
                "fen": fen,
                "eco": eco,
                "moves": moves,
            }
        else:
            existing_moves = families[family]["lines"][name].get("moves", "")
            if len(moves) > len(existing_moves):
                families[family]["lines"][name] = {
                    "fen": fen,
                    "eco": eco,
                    "moves": moves,
                }

    # Sort families alphabetically
    sorted_families = dict(sorted(families.items()))

    # Sort lines within each family alphabetically
    for family in sorted_families.values():
        family["lines"] = dict(sorted(family["lines"].items()))

    # Write output
    output_path = os.path.join(eco_directory, "openings.json")
    with open(output_path, "w") as f:
        json.dump(sorted_families, f, indent=2)

    # Also copy to frontend for the practice view
    frontend_path = os.path.join(
        eco_directory, "..", "..", "frontend", "public", "data", "openings.json"
    )
    with open(frontend_path, "w") as f:
        json.dump(sorted_families, f)

    print(f"Built {len(sorted_families)} families")
    total_lines = sum(len(f["lines"]) for f in sorted_families.values())
    print(f"Total lines: {total_lines}")
    print(f"Written to: {output_path}")
    print(f"Written to: {frontend_path}")


if __name__ == "__main__":
    main()
