import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath('.'))

from app.db.session import AsyncSessionLocal
from app.models.user import User
from app.agents.rag_agent import rag_agent

async def main():
    async with AsyncSessionLocal() as db:
        res = await rag_agent.ask("What vaccines are in my report?", 1, db)
        print("RAG Answer:", res)

asyncio.run(main())
