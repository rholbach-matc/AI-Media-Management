from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_password_hash
from app.core.config import settings
from app.models.enums import UserRole
from app.models.user import User


async def seed_default_users(db: AsyncSession) -> None:
    result = await db.execute(select(func.count()).select_from(User))
    user_count = result.scalar_one()
    if user_count > 0:
        return

    users_to_create = [
        ("ryan", "Ryan", settings.DEFAULT_USER_PASS_RYAN),
        ("bella", "Bella", settings.DEFAULT_USER_PASS_BELLA),
    ]

    missing_passwords = [username for username, _, password in users_to_create if not password]
    if missing_passwords:
        missing = ", ".join(f"DEFAULT_USER_PASS_{username.upper()}" for username in missing_passwords)
        raise RuntimeError(f"Missing default user password environment variables: {missing}")

    for username, display_name, password in users_to_create:
        db.add(
            User(
                username=username,
                password_hash=get_password_hash(password or ""),
                display_name=display_name,
                role=UserRole.ADMIN,
            )
        )

    await db.commit()
