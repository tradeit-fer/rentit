"""Dodaje početne kategorije oglasa."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "4d9e5b2a7c31"
down_revision: Union[str, Sequence[str], None] = "3c8d4a1b6f20"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    categories = sa.table(
        "categories",
        sa.column("name", sa.String),
        sa.column("parent_id", sa.Integer),
    )
    names = [
        "Alati",
        "Tools & garden",
        "Photo & video",
        "Sports & outdoors",
        "Home & spaces",
        "Learning & electronics",
        "Parties & events",
        "Services",
    ]

    connection = op.get_bind()
    existing = set(connection.execute(sa.select(categories.c.name)).scalars())
    for name in names:
        if name not in existing:
            connection.execute(
                categories.insert().values(name=name, parent_id=None)
            )


def downgrade() -> None:
    connection = op.get_bind()
    connection.execute(
        sa.text(
            "DELETE FROM categories WHERE name IN "
            "('Alati', 'Tools & garden', 'Photo & video', 'Sports & outdoors', "
            "'Home & spaces', 'Learning & electronics', 'Parties & events', 'Services')"
        )
    )
