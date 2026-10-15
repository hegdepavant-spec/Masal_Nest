import asyncio
import sys

sys.stdout.reconfigure(encoding='utf-8')

from app.db.session import async_session_factory
from app.services.lead_service import LeadService


async def run_v3_migration():
    print("Starting controlled v3.0.0 scoring migration...")
    async with async_session_factory() as session:
        service = LeadService(session)
        count = await service.recalculate_all_scores()
        await session.commit()
        print(f"Successfully migrated, committed, and recalculated {count} analyzed leads to scoring v3.0.0.")


if __name__ == "__main__":
    asyncio.run(run_v3_migration())
