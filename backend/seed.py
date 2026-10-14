"""Seed script to populate sample real-estate leads, analyses, tasks, and chat messages."""

import asyncio
from datetime import date, timedelta
import json

from app.db.models import Lead, LeadAnalysis, FollowupTask, ChatMessage
from app.db.session import async_session_factory, init_db


SAMPLE_LEADS = [
    {
        "customer_name": "Arjun Sharma",
        "location": "Whitefield, Bangalore",
        "property_requirement": "4 BHK luxury villa with private garden, gated community",
        "budget": "₹3.5 - 4.5 Cr",
        "buying_timeline": "immediate (within 30 days)",
        "customer_message": "Looking to relocate from Singapore by next month. Pre-approved for bank loan, budget ready. Need possession-ready or under 3-month handover. Please arrange site visits this weekend if possible.",
        "priority_score": 92,
        "priority_category": "hot",
        "followup_status": "in_progress",
        "analysis": {
            "summary": "High-urgency NRI relocating within 30 days. Pre-approved loan and ready budget for 4 BHK luxury villa in Whitefield.",
            "customer_intent": "buying",
            "key_requirements": ["4 BHK luxury villa", "Private garden", "Gated community", "Within 30-day timeline", "Whitefield location"],
            "inferred_requirements": ["High-end amenities", "Good security for NRI family", "Close to international schools"],
            "objections": ["Strict 3-month handover limit"],
            "missing_info": ["Preferred plot size", "Vastu orientation preference"],
            "recommended_action": "Schedule high-priority weekend site visit and send 3 ready-to-move villa options immediately.",
            "suggested_response": "Hi Arjun, welcome back to Bangalore! We have 2 premium ready-to-move 4 BHK villas in prime Whitefield matching your ₹4 Cr budget. Can we schedule a private tour this Saturday at 11 AM?",
            "urgency_signals": ["Relocating next month", "Site visit requested this weekend", "Pre-approved loan"],
            "readiness_signals": ["Pre-approved bank loan", "Budget explicitly defined", "Ready to purchase immediately"],
            "score_explanation": "Maximum urgency score due to 30-day timeline; pre-approved financing and clear luxury requirements qualify this as a Top Hot Lead.",
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
            {"role": "assistant", "content": "Based on Arjun's ₹3.5-4.5 Cr budget and 30-day timeline, Prestige Golfshire and Raffles Park are prime options. Prestige offers ready possession with private gardens matching his exact request."},
        ],
    },
    {
        "customer_name": "Priyanka Deshmukh",
        "location": "Bandra West, Mumbai",
        "property_requirement": "3 BHK sea-view apartment with 2 parking spaces",
        "budget": "₹7 - 8 Cr",
        "buying_timeline": "2-3 months",
        "customer_message": "Looking to upgrade from our 2 BHK. Need sea-facing view, modern club amenities, and 2 designated car parks. We are actively touring properties but finalizing in Q2.",
        "priority_score": 78,
        "priority_category": "hot",
        "followup_status": "in_progress",
        "analysis": {
            "summary": "Active home upgrader seeking 3 BHK sea-view residence in Bandra West with 2-3 month decision window.",
            "customer_intent": "buying",
            "key_requirements": ["3 BHK sea view", "Bandra West", "2 car parking spots", "Modern amenities"],
            "inferred_requirements": ["High floor preferred for unobstructed view", "Reputable A-grade builder"],
            "objections": ["High price per sqft in Bandra West"],
            "missing_info": ["Financing type (all-equity vs home loan)"],
            "recommended_action": "Share curated sea-facing listings on Carter Road and Bandstand.",
            "suggested_response": "Hello Priyanka, we have an exclusive sea-facing 3 BHK on Carter Road with panoramic Arabian Sea views and 2 covered parkings within your budget. Would you like a video walkthrough?",
            "urgency_signals": ["Actively touring properties", "Targeting Q2 finalization"],
            "readiness_signals": ["Clear budget bracket", "Specific location criteria"],
            "score_explanation": "Strong purchase intent with realistic budget for Bandra West; 2-3 month timeline places this solidly in the Hot category.",
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


async def seed_database():
    """Seed the database with sample leads."""
    print("Initializing DB tables...")
    await init_db()

    async with async_session_factory() as session:
        for lead_data in SAMPLE_LEADS:
            analysis_data = lead_data.pop("analysis", None)
            tasks_data = lead_data.pop("tasks", [])
            chats_data = lead_data.pop("chats", [])

            lead = Lead(**lead_data)
            session.add(lead)
            await session.flush()

            if analysis_data:
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
                    scoring_evidence=json.dumps({"intent": 25, "timeline": 28, "clarity": 20, "next_steps": 15}),
                    score_explanation=analysis_data["score_explanation"],
                )
                session.add(analysis)

            for task_data in tasks_data:
                task = FollowupTask(lead_id=lead.id, **task_data)
                session.add(task)

            for chat_data in chats_data:
                chat = ChatMessage(lead_id=lead.id, **chat_data)
                session.add(chat)

        await session.commit()
        print(f"Successfully seeded {len(SAMPLE_LEADS)} leads with analyses, tasks, and chats!")


if __name__ == "__main__":
    asyncio.run(seed_database())
