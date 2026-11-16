"""Dodaje oznake, značajke i slike oglasu."""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "5e1a6b3c8d42"
down_revision: Union[str, Sequence[str], None] = "4d9e5b2a7c31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("listings", sa.Column("tags", sa.JSON(), nullable=True))
    op.add_column("listings", sa.Column("features", sa.JSON(), nullable=True))
    op.add_column("listings", sa.Column("images", sa.JSON(), nullable=True))

    op.execute("UPDATE listings SET tags = '[]' WHERE tags IS NULL")
    op.execute("UPDATE listings SET features = '[]' WHERE features IS NULL")
    op.execute("UPDATE listings SET images = '[]' WHERE images IS NULL")

    op.alter_column("listings", "tags", nullable=False)
    op.alter_column("listings", "features", nullable=False)
    op.alter_column("listings", "images", nullable=False)


def downgrade() -> None:
    op.drop_column("listings", "images")
    op.drop_column("listings", "features")
    op.drop_column("listings", "tags")
