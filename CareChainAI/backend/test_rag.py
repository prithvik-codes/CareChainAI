import asyncio
import os
import sys

# Add backend directory to sys.path so we can import app
sys.path.insert(0, os.path.abspath('.'))

from app.db.session import AsyncSessionLocal
from app.models.user import User  # IMPORT USER FIRST
from app.models.report import Report
from app.models.embedding import Embedding
from app.agents.rag_agent import rag_agent
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as db:
        # Get a user id who has reports
        result = await db.execute(select(Report.user_id).distinct())
        users = result.scalars().all()
        if not users:
            print("No users with reports.")
            return
        
        user_id = users[0]
        print(f"Testing with user_id={user_id}")
        
        # Test 1: General question
        res1 = await rag_agent.ask("Hello, what is a normal blood pressure?", user_id, db)
        print("General Q:", res1)
        
        # Test 2: RAG question
        res2 = await rag_agent.ask("What is in my latest report?", user_id, db)
        print("RAG Q:", res2)

asyncio.run(main())
