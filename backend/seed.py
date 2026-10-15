"""Seed script to populate sample real-estate leads, analyses, tasks, and chat messages."""

import asyncio
from datetime import date, timedelta
import json
import sys
from typing import Any

# Configure UTF-8 encoding on Windows to avoid UnicodeEncodeError with currency symbols (e.g. ₹)
if sys.platform == "win32":
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            getattr(sys.stdout, "reconfigure")(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            getattr(sys.stderr, "reconfigure")(encoding="utf-8")
    except Exception:
        pass

from app.db.models import Lead, LeadAnalysis, FollowupTask, ChatMessage
from app.db.session import async_session_factory, init_db


SAMPLE_LEADS: list[dict[str, Any]] = [
    {
        "customer_name": "Arjun Sharma",
        "location": "Whitefield, Bangalore",
        "property_requirement": "4 BHK luxury villa with private garden, gated community",
        "budget": "₹3.5 - 4.5 Cr",
        "buying_timeline": "Within 1 month (relocation); 3-month handover limit",
        "customer_message": "Looking to relocate from Singapore by next month. Pre-approved for bank loan, budget ready. Must have possession within a strict 3-month (30-day) handover window; cannot consider properties with longer delivery timelines. Please arrange site visits this weekend if possible.",
        "priority_score": 85,
        "priority_category": "hot",
        "followup_status": "in_progress",
        "analysis": {
            "summary": "High-intent NRI relocating from Singapore next month. Pre-approved loan and ready budget for 4 BHK luxury villa in Whitefield with a strict 3-month possession deadline.",
            "customer_intent": "buying",
            "key_requirements": ["4 BHK luxury villa", "Private garden", "Gated community", "Whitefield location"],
            "hard_constraints": ["Must have possession within 3 months (~90 days); cannot consider properties with longer delivery timelines"],
            "inferred_requirements": ["High-end amenities", "Good security for NRI family", "Close to international schools"],
            "objections": [],
            "missing_info": ["Preferred plot size", "Vastu orientation preference", "Verify 30-day notation in handover statement"],
            "recommended_action": "Schedule high-priority weekend site visit and send 3 ready-to-move villa options matching under-90-day possession limit.",
            "suggested_response": "Hi Arjun, welcome back to Bangalore! We have 2 premium ready-to-move 4 BHK villas in prime Whitefield matching your ₹4 Cr budget and 3-month handover requirement. Can we schedule a private tour this Saturday at 11 AM?",
            "urgency_signals": ["Relocating next month", "Site visit requested this weekend"],
            "readiness_signals": ["Pre-approved bank loan", "Budget explicitly defined", "Ready to purchase immediately"],
            "score_explanation": "Score 85/100 (Hot). Declared intent: buying (25/25 pts); Timeline: relocating next month / purchase within 30 days (20/25 pts); Clear ₹4 Cr budget & luxury villa specs (20/20 pts); Weekend site visit & pre-approved loan (16/20 pts); Operational 3-month handover constraint specified (5/10 pts).",
        },
        "tasks": [
            {
                "title": "Send 3 ready-to-move villa brochures in Whitefield",
                "description": "Include floor plans, pricing sheets, and club house photos.",
                "action_type": "email",
                "status": "completed",
                "due_date": date.today() - timedelta(days=1),
                "created_by": "ai",
            },
            {
                "title": "Confirm Saturday 11 AM site visit with Arjun",
                "description": "Coordinate chauffeur pickup and site supervisor availability.",
                "action_type": "call",
                "status": "pending",
                "due_date": date.today() + timedelta(days=1),
                "created_by": "ai",
            },
        ],
        "chats": [
            {"role": "user", "content": "What are the best ready villas in Whitefield for Arjun?"},
            {"role": "assistant", "content": "Based on Arjun's ₹3.5-4.5 Cr budget and under-90-day possession requirement, Prestige Golfshire and Raffles Park are prime options. Both offer ready possession with private gardens matching his exact request."},
        ],
    },
    {
        "customer_name": "Priyanka Deshmukh",
        "location": "Bandra West, Mumbai",
        "property_requirement": "3 BHK sea-view apartment with 2 parking spaces",
        "budget": "₹7 - 8 Cr",
        "buying_timeline": "2-3 months",
        "customer_message": "Looking to upgrade from our 2 BHK. Need sea-facing view, modern club amenities, and 2 designated car parks. We are actively touring properties but finalizing in Q2.",
        "priority_score": 64,
        "priority_category": "warm",
        "followup_status": "in_progress",
        "analysis": {
            "summary": "Active home upgrader seeking 3 BHK sea-view residence in Bandra West with 2-3 month decision window.",
            "customer_intent": "buying",
            "key_requirements": ["3 BHK sea view", "Bandra West", "2 car parking spots", "Modern amenities"],
            "hard_constraints": ["Sea-facing view required", "2 designated car parks"],
            "inferred_requirements": ["High floor preferred for unobstructed view", "Reputable A-grade builder"],
            "objections": [],
            "missing_info": ["Financing type (all-equity vs home loan)"],
            "recommended_action": "Share curated sea-facing listings on Carter Road and Bandstand.",
            "suggested_response": "Hello Priyanka, we have an exclusive sea-facing 3 BHK on Carter Road with panoramic Arabian Sea views and 2 covered parkings within your budget. Would you like a video walkthrough?",
            "urgency_signals": ["Actively touring properties", "Targeting Q2 finalization"],
            "readiness_signals": ["Clear budget bracket", "Specific location criteria"],
            "score_explanation": "Score 64/100 (Warm). Declared intent: buying (20/25 pts); Timeline: 2-3 months / Q2 (10/25 pts); Specified ₹7-8 Cr budget & sea-view specs (20/20 pts); Active touring (10/20 pts); Sea-facing view constraint (5/10 pts).",
        },
        "tasks": [
            {
                "title": "Send Carter Road apartment video walkthrough",
                "description": "WhatsApp walkthrough video of high-floor sea facing 3 BHK.",
                "action_type": "site_visit",
                "status": "pending",
                "due_date": date.today() + timedelta(days=2),
                "created_by": "ai",
            }
        ],
        "chats": [],
    },
    {
        "customer_name": "Vikram Malhotra",
        "location": "DLF Phase 5, Gurgaon",
        "property_requirement": "Commercial office space or retail shop, 1500-2000 sq ft",
        "budget": "₹2 - 2.5 Cr",
        "buying_timeline": "3-6 months",
        "customer_message": "Evaluating commercial investment opportunities for rental yield. Comparing Golf Course Road vs Cyber City extension. Not in a rush, looking for 7%+ gross rental yield.",
        "priority_score": 58,
        "priority_category": "warm",
        "followup_status": "new",
        "analysis": {
            "summary": "Yield-focused commercial investor evaluating retail/office options in Gurgaon with 3-6 month horizon.",
            "customer_intent": "investing",
            "key_requirements": ["1500-2000 sq ft commercial", "Gurgaon DLF / Golf Course Road", "7%+ rental yield"],
            "inferred_requirements": ["Pre-leased property preferred to secure immediate yield"],
            "objections": ["Low yields on new commercial launches"],
            "missing_info": ["Lease tenure preference", "Tenant profile preference (MNC vs Retail)"],
            "recommended_action": "Send comparative yield analysis sheet for pre-leased commercial units on Golf Course Road.",
            "suggested_response": "Hi Vikram, we have curated a comparison report of 3 pre-leased Grade-A commercial properties currently generating 7.4% to 8.1% verified yields. Let me know if you would like me to share the financial model.",
            "urgency_signals": ["Not in a rush"],
            "readiness_signals": ["Concrete yield requirement", "Clear capital allocation"],
            "score_explanation": "Solid investor profile but flexible timeline (3-6 months) keeps priority at Warm.",
        },
        "tasks": [
            {
                "title": "Email commercial rental yield comparison spreadsheet",
                "description": "Include tenant credit ratings and lock-in period details.",
                "action_type": "document",
                "status": "pending",
                "due_date": date.today() + timedelta(days=3),
                "created_by": "ai",
            }
        ],
        "chats": [],
    },
    {
        "customer_name": "Sneha Reddy",
        "location": "Gachibowli / Financial District, Hyderabad",
        "property_requirement": "2 or 3 BHK high-rise flat near IT corridor",
        "budget": "₹1 - 1.3 Cr",
        "buying_timeline": "6+ months",
        "customer_message": "Just started exploring. Working in Financial District. Want to know what is coming up in Gachibowli or Tellapur under 1.2 Cr. Need easy commute.",
        "priority_score": 42,
        "priority_category": "warm",
        "followup_status": "new",
        "analysis": {
            "summary": "First-time explorer working in Hyderabad IT corridor, looking for 2/3 BHK within 1.3 Cr.",
            "customer_intent": "exploring",
            "key_requirements": ["Near Financial District", "Under ₹1.3 Cr", "2 or 3 BHK"],
            "inferred_requirements": ["Good connectivity, commute time under 20 mins"],
            "objections": ["Under-construction delay risks"],
            "missing_info": ["Down payment readiness", "Bank loan eligibility"],
            "recommended_action": "Send newly launched residential projects handbook around Tellapur & Nanakramguda.",
            "suggested_response": "Hi Sneha, Tellapur and Kollur have great upcoming projects from reputed builders starting at ₹1.1 Cr with 20-minute shuttle connectivity to Financial District. Happy to email our comprehensive buyer guide.",
            "urgency_signals": ["Just started exploring"],
            "readiness_signals": ["Working in target locality"],
            "score_explanation": "Early exploration stage with 6+ month horizon. Qualifies as Warm lead needing nurturing.",
        },
        "tasks": [],
        "chats": [],
    },
    {
        "customer_name": "Rajesh Kumar",
        "location": "Noida Expressway, Sector 150",
        "property_requirement": "Plots or low-rise floors",
        "budget": "Not specified",
        "buying_timeline": "Just inquiring",
        "customer_message": "Send details of all projects in Noida.",
        "priority_score": 18,
        "priority_category": "cold",
        "followup_status": "new",
        "analysis": {
            "summary": "Vague exploratory inquiry requesting general details across all Noida projects without budget or timeline.",
            "customer_intent": "unclear",
            "key_requirements": ["Noida location"],
            "inferred_requirements": [],
            "objections": [],
            "missing_info": ["Budget", "Timeline", "Property type specifics", "Financing readiness"],
            "recommended_action": "Send automated overview brochure and request qualification details.",
            "suggested_response": "Hi Rajesh, thanks for contacting Masal AI. To help you find the right property in Noida, could you share your preferred property type (apartment or plot) and approximate budget range?",
            "urgency_signals": [],
            "readiness_signals": [],
            "score_explanation": "Lacks budget, timeline, and specific criteria. Cold lead requiring automated discovery.",
        },
        "tasks": [],
        "chats": [],
    },
    {
        "customer_name": "Meera Nambiar",
        "location": "Kakkanad, Kochi",
        "property_requirement": "3 BHK waterfront apartment near Infopark",
        "budget": "₹85 - 95 Lakhs",
        "buying_timeline": "1-2 months",
        "customer_message": "Need a ready waterfront apartment near Kochi Infopark for immediate occupation. Husband working in US, plan to move in before school starts in June. Already have loan sanctioned from SBI.",
        "priority_score": None,
        "priority_category": None,
        "followup_status": "new",
        "analysis": None,
        "tasks": [],
        "chats": [],
    },
]


from sqlalchemy import select


async def cleanup_duplicate_seed_data(session) -> None:
    """Safely consolidate duplicate seed leads created by repeated seed runs."""
    sample_names = {lead["customer_name"] for lead in SAMPLE_LEADS}
    for name in sample_names:
        stmt = select(Lead).where(Lead.customer_name == name).order_by(Lead.created_at.asc())
        leads = (await session.execute(stmt)).scalars().all()
        if len(leads) <= 1:
            continue

        # Keep primary lead (earliest)
        primary = leads[0]
        duplicates = leads[1:]

        for dup in duplicates:
            # Re-associate tasks to primary if not duplicate
            task_stmt = select(FollowupTask).where(FollowupTask.lead_id == dup.id)
            dup_tasks = (await session.execute(task_stmt)).scalars().all()
            for dt in dup_tasks:
                existing = (
                    await session.execute(
                        select(FollowupTask).where(
                            FollowupTask.lead_id == primary.id,
                            FollowupTask.title == dt.title,
                        )
                    )
                ).scalars().first()
                if not existing:
                    dt.lead_id = primary.id
                else:
                    await session.delete(dt)

            # Re-associate chats to primary if not duplicate
            chat_stmt = select(ChatMessage).where(ChatMessage.lead_id == dup.id)
            dup_chats = (await session.execute(chat_stmt)).scalars().all()
            for dc in dup_chats:
                existing_chat = (
                    await session.execute(
                        select(ChatMessage).where(
                            ChatMessage.lead_id == primary.id,
                            ChatMessage.content == dc.content,
                        )
                    )
                ).scalars().first()
                if not existing_chat:
                    dc.lead_id = primary.id
                else:
                    await session.delete(dc)

            # Delete the redundant duplicate lead record
            await session.delete(dup)

        await session.flush()


async def seed_database():
    """Seed the database with sample leads idempotently."""
    print("Initializing DB tables...")
    await init_db()

    async with async_session_factory() as session:
        # First, deduplicate any previously duplicated seed records
        await cleanup_duplicate_seed_data(session)

        for raw_lead in SAMPLE_LEADS:
            lead_data: dict[str, Any] = dict(raw_lead)
            analysis_data: dict[str, Any] | None = lead_data.pop("analysis", None)
            tasks_data: list[dict[str, Any]] = lead_data.pop("tasks", [])
            chats_data: list[dict[str, Any]] = lead_data.pop("chats", [])

            # Check if lead already exists
            lead_stmt = select(Lead).where(Lead.customer_name == lead_data["customer_name"])
            existing_lead = (await session.execute(lead_stmt)).scalars().first()

            if existing_lead:
                lead = existing_lead
            else:
                lead = Lead(**lead_data)
                session.add(lead)
                await session.flush()

            if analysis_data:
                analysis_stmt = select(LeadAnalysis).where(LeadAnalysis.lead_id == lead.id)
                existing_analysis = (await session.execute(analysis_stmt)).scalars().first()
                if not existing_analysis:
                    from app.schemas.analysis import LeadAnalysisResult
                    from app.services.scoring_service import calculate_score

                    ar = LeadAnalysisResult(
                        summary=analysis_data["summary"],
                        customer_intent=analysis_data["customer_intent"],
                        key_requirements=analysis_data["key_requirements"],
                        inferred_requirements=analysis_data["inferred_requirements"],
                        objections=analysis_data["objections"],
                        missing_info=analysis_data["missing_info"],
                        recommended_action=analysis_data["recommended_action"],
                        suggested_response=analysis_data["suggested_response"],
                        urgency_signals=analysis_data["urgency_signals"],
                        readiness_signals=analysis_data["readiness_signals"],
                        hard_constraints=analysis_data.get("hard_constraints", []),
                    )
                    score_res = calculate_score(
                        analysis=ar,
                        buying_timeline=lead.buying_timeline,
                        budget=lead.budget,
                        property_requirement=lead.property_requirement,
                        customer_message=lead.customer_message,
                        location=lead.location,
                    )
                    evidence_payload = {
                        "timeline_score": score_res.timeline_score,
                        "intent_score": score_res.intent_score,
                        "financial_score": score_res.financial_score,
                        "clarity_score": score_res.clarity_score,
                        "qualification_score": score_res.qualification_score,
                        "next_steps_score": score_res.next_steps_score,
                        "objection_penalty": score_res.objection_penalty,
                        "total_score": score_res.total_score,
                        "category": score_res.category,
                        "factors": score_res.factors,
                        "timeline_info": score_res.timeline_info.model_dump() if score_res.timeline_info else None,
                        "scoring_version": score_res.scoring_version,
                        "known_features": score_res.known_features,
                        "unknown_features": score_res.unknown_features,
                    }
                    analysis = LeadAnalysis(
                        lead_id=lead.id,
                        summary=analysis_data["summary"],
                        customer_intent=analysis_data["customer_intent"],
                        key_requirements=json.dumps(analysis_data["key_requirements"]),
                        inferred_requirements=json.dumps(analysis_data["inferred_requirements"]),
                        objections=json.dumps(analysis_data["objections"]),
                        missing_info=json.dumps(analysis_data["missing_info"]),
                        recommended_action=analysis_data["recommended_action"],
                        suggested_response=analysis_data["suggested_response"],
                        urgency_signals=json.dumps(analysis_data["urgency_signals"]),
                        readiness_signals=json.dumps(analysis_data["readiness_signals"]),
                        scoring_evidence=json.dumps(evidence_payload),
                        score_explanation=score_res.explanation,
                    )
                    session.add(analysis)

            for task_data in tasks_data:
                task_stmt = select(FollowupTask).where(
                    FollowupTask.lead_id == lead.id,
                    FollowupTask.title == task_data["title"],
                )
                existing_task = (await session.execute(task_stmt)).scalars().first()
                if not existing_task:
                    task = FollowupTask(lead_id=lead.id, **task_data)
                    session.add(task)

            for chat_data in chats_data:
                chat_stmt = select(ChatMessage).where(
                    ChatMessage.lead_id == lead.id,
                    ChatMessage.content == chat_data["content"],
                )
                existing_chat = (await session.execute(chat_stmt)).scalars().first()
                if not existing_chat:
                    chat = ChatMessage(lead_id=lead.id, **chat_data)
                    session.add(chat)

        await session.commit()
        print(f"Successfully processed {len(SAMPLE_LEADS)} sample leads with idempotent seeding!")


if __name__ == "__main__":
    asyncio.run(seed_database())

