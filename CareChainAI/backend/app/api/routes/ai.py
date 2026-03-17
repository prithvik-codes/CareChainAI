"""AI Q&A route — RAG pipeline endpoint."""
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.agents.rag_agent import rag_agent
from app.agents.critic_agent import critic_agent
from app.api.deps import get_current_user

router = APIRouter()


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    sources: list[int]
    retrieved_chunks: int
    safe: bool
    warnings: list[str]


@router.post("/ask", response_model=AskResponse)
async def ask_ai(
    body: AskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # RAG pipeline
    rag_result = await rag_agent.ask(body.question, current_user.id, db)

    # Critic validation
    critic_result = critic_agent.validate(rag_result["answer"])

    return AskResponse(
        answer=critic_result["answer"],
        sources=rag_result["sources"],
        retrieved_chunks=rag_result["retrieved_chunks"],
        safe=critic_result["safe"],
        warnings=critic_result["warnings"],
    )
