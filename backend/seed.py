"""
Comprehensive seed script — creates:
  • 1 admin user
  • 50 realistic jobs across 10 departments with AI criteria
  • 120 candidates with structured profile data
  • 150 applications with Gemini-style score breakdowns
  • 80 interview sessions with realistic transcripts + AI suggestions
  • 65 interview scorecards
  • 55 final evaluations with ACCEPT/HOLD/REJECT verdicts
Run: python seed.py
"""
import sys, os, json, random, uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

random.seed(42)

# ─── Helper ────────────────────────────────────────────────────────────────────
def rnd_date(days_back=90):
    return datetime.utcnow() - timedelta(days=random.randint(0, days_back))

def pct_score():
    return round(random.betavariate(5, 2), 3)   # skewed toward higher scores (demo friendly)

def low_score():
    return round(random.betavariate(2, 5), 3)

def coin(p=0.5):
    return random.random() < p

# ─── 1. Admin user ────────────────────────────────────────────────────────────
if not db.query(models.User).filter(models.User.id == 1).first():
    db.add(models.User(id=1, username="admin@talentai.com", role="Admin"))
    db.commit()

# ─── 2. Jobs (50) ─────────────────────────────────────────────────────────────
JOBS = [
    # Engineering
    ("Senior Backend Engineer", "engineering", "Design scalable microservices using Python FastAPI, PostgreSQL, Redis. Lead 3 junior devs. 5+ yrs exp."),
    ("Frontend Developer", "engineering", "Build React/TypeScript SPAs with glassmorphism UI. TailwindCSS, Figma-to-code. 3+ yrs exp."),
    ("DevOps / Platform Engineer", "engineering", "Manage Kubernetes on GKE, Terraform IaC, CI/CD with GitHub Actions. SRE mindset."),
    ("Mobile Developer (React Native)", "engineering", "Cross-platform iOS/Android app development. Expo, Redux, REST/GraphQL. 3+ yrs."),
    ("Machine Learning Engineer", "engineering", "Build and deploy ML models at scale. PyTorch, TensorFlow, MLflow. 4+ yrs."),
    ("Data Engineer", "engineering", "Build ETL pipelines with Spark, Airflow, BigQuery. 3+ yrs data engineering."),
    ("Security Engineer", "engineering", "Pen testing, SIEM, zero-trust architecture. CISSP preferred. 5+ yrs."),
    ("QA Automation Engineer", "engineering", "Selenium, Playwright, pytest. CI integration, test strategy. 3+ yrs."),
    ("Embedded Systems Engineer", "engineering", "C/C++ firmware, RTOS, hardware debugging. IoT background a plus."),
    ("Blockchain Developer", "engineering", "Solidity smart contracts, Hardhat, Web3.js. DeFi protocol experience preferred."),
    # AI / Data Science
    ("AI Research Scientist", "ai_research", "Publish and implement SOTA NLP/CV models. PhD preferred. PyTorch, HuggingFace."),
    ("Data Scientist", "ai_research", "Statistical modeling, A/B testing, dashboards. Python, R, SQL. 3+ yrs."),
    ("Computer Vision Engineer", "ai_research", "Object detection, segmentation, OpenCV. YOLO, SAM. Real-time inference."),
    ("NLP Engineer", "ai_research", "LLM fine-tuning, RAG pipelines, LangChain. Transformers library."),
    ("MLOps Engineer", "ai_research", "Model serving, monitoring, drift detection. Seldon, BentoML, Prometheus."),
    # Product
    ("Senior Product Manager", "product", "Define roadmap, run discovery, coordinate cross-functional teams. 5+ yrs in SaaS PM."),
    ("Product Designer", "product", "End-to-end UX: research, wireframes, Figma prototypes. 4+ yrs in B2B SaaS."),
    ("Growth Product Manager", "product", "Funnel optimization, feature flags, analytics. SQL + experimentation mindset."),
    ("Technical Program Manager", "product", "Multi-team coordination, OKRs, risk tracking. PMP/PMI a plus."),
    # Marketing
    ("Head of Marketing", "marketing", "Brand strategy, demand gen, team of 5. B2B SaaS background required."),
    ("Content Marketing Manager", "marketing", "SEO blog, thought leadership, editorial calendar. 3+ yrs SaaS content."),
    ("Performance Marketing Manager", "marketing", "Google Ads, Meta Ads, LinkedIn. ROAS-driven mindset. 3+ yrs."),
    ("Product Marketing Manager", "marketing", "Positioning, messaging, GTM. Partner with sales and product."),
    ("SEO Specialist", "marketing", "Technical SEO, keyword research, content optimization. Ahrefs, Screaming Frog."),
    # Sales
    ("Enterprise Account Executive", "sales", "Close $200k+ ARR deals. SaaS full-cycle AE. 5+ yrs enterprise B2B."),
    ("SDR / BDR Lead", "sales", "Outbound sequencing, Salesforce, cold calling. 2+ yrs SaaS SDR."),
    ("Sales Operations Manager", "sales", "CRM hygiene, forecasting, territory planning. RevOps background."),
    ("Customer Success Manager", "sales", "Own NRR, onboarding, QBRs. SaaS CS 3+ yrs. Gainsight preferred."),
    # Finance
    ("Senior Financial Analyst", "finance", "FP&A, 3-statement modeling, SaaS metrics. CFA preferred. 4+ yrs."),
    ("Controller", "finance", "Month-end close, GAAP compliance, audit prep. CPA required. 6+ yrs."),
    ("Revenue Operations Analyst", "finance", "Bookings, ARR/MRR reconciliation, billing. Stripe, NetSuite experience."),
    # HR / People
    ("Head of People", "hr", "HRBP, talent strategy, comp & benefits, culture. 7+ yrs. SHRM preferred."),
    ("Technical Recruiter", "hr", "Full-cycle recruiting for engineering. LinkedIn Recruiter, Greenhouse. 3+ yrs."),
    ("Learning & Development Manager", "hr", "Design learning paths, onboarding, manager enablement. 4+ yrs."),
    # Legal & Compliance
    ("General Counsel", "legal", "SaaS contracts, privacy law, IP, M&A. JD required. 8+ yrs in-house."),
    ("Data Privacy Officer", "legal", "GDPR, CCPA, DPDP compliance. DPO certification preferred."),
    # Operations
    ("Chief of Staff", "operations", "Executive support, OKR tracking, strategic projects. 4+ yrs in ops or consulting."),
    ("Business Analyst", "operations", "Requirements gathering, process mapping, stakeholder management. 3+ yrs."),
    ("IT Manager", "operations", "MDM, SSO, network, help desk team of 3. 5+ yrs. ITIL preferred."),
    ("Procurement Manager", "operations", "Vendor negotiation, SaaS spend, contracts. 4+ yrs."),
    # Customer Support
    ("Head of Customer Support", "support", "Build and scale support team. Zendesk, CSAT/NPS ownership. 5+ yrs."),
    ("Technical Support Engineer", "support", "API debugging, log analysis, tier-2 escalations. Python scripting."),
    ("Community Manager", "support", "Developer community, Discord, forum moderation. 3+ yrs in DevRel or community."),
    # Research
    ("UX Researcher", "research", "Usability testing, surveys, diary studies. 3+ yrs, mixed methods."),
    ("Market Research Analyst", "research", "Competitive intelligence, customer segmentation, TAM sizing. 3+ yrs."),
    # Executive
    ("VP of Engineering", "executive", "Scale 50+ eng org, architecture governance, hiring. 10+ yrs, prior VP exp."),
    ("CTO (fractional)", "executive", "Technical strategy, board reporting, team mentoring. Equity-based contract."),
    ("VP of Sales", "executive", "Build 20-person AE team, own $5M ARR plan. SaaS scale-up exp."),
    ("Chief Product Officer", "executive", "Set product vision, manage PMs and designers. B2B SaaS 10+ yrs."),
    ("Head of AI/ML", "executive", "Own AI roadmap, hire researchers, drive product integration. PhD + leadership exp."),
]

CRITERIA_BY_DEPT = {
    "engineering":  [{"name":"Technical Depth","weight":0.35},{"name":"System Design","weight":0.25},{"name":"Code Quality","weight":0.2},{"name":"Communication","weight":0.1},{"name":"Culture Fit","weight":0.1}],
    "ai_research":  [{"name":"ML Fundamentals","weight":0.4},{"name":"Research Quality","weight":0.3},{"name":"Engineering Rigor","weight":0.2},{"name":"Communication","weight":0.1}],
    "product":      [{"name":"Product Thinking","weight":0.35},{"name":"Stakeholder Management","weight":0.25},{"name":"Data Literacy","weight":0.2},{"name":"Communication","weight":0.2}],
    "marketing":    [{"name":"Domain Expertise","weight":0.35},{"name":"Analytical Skills","weight":0.25},{"name":"Creativity","weight":0.2},{"name":"Communication","weight":0.2}],
    "sales":        [{"name":"Sales Track Record","weight":0.4},{"name":"Product Knowledge","weight":0.2},{"name":"Communication","weight":0.25},{"name":"Resilience","weight":0.15}],
    "finance":      [{"name":"Financial Modeling","weight":0.4},{"name":"Attention to Detail","weight":0.3},{"name":"Tools Proficiency","weight":0.2},{"name":"Communication","weight":0.1}],
    "hr":           [{"name":"People Expertise","weight":0.35},{"name":"Empathy","weight":0.25},{"name":"Strategic Thinking","weight":0.25},{"name":"Communication","weight":0.15}],
    "legal":        [{"name":"Legal Expertise","weight":0.45},{"name":"Risk Assessment","weight":0.3},{"name":"Communication","weight":0.15},{"name":"Attention to Detail","weight":0.1}],
    "operations":   [{"name":"Problem Solving","weight":0.35},{"name":"Process Design","weight":0.3},{"name":"Stakeholder Management","weight":0.2},{"name":"Communication","weight":0.15}],
    "support":      [{"name":"Technical Knowledge","weight":0.3},{"name":"Customer Empathy","weight":0.35},{"name":"Problem Solving","weight":0.2},{"name":"Communication","weight":0.15}],
    "research":     [{"name":"Research Methods","weight":0.4},{"name":"Analytical Skills","weight":0.3},{"name":"Communication","weight":0.2},{"name":"Curiosity","weight":0.1}],
    "executive":    [{"name":"Leadership","weight":0.4},{"name":"Strategic Vision","weight":0.3},{"name":"Execution","weight":0.2},{"name":"Communication","weight":0.1}],
}

print(f"Creating {len(JOBS)} jobs...")
job_objs = []
for title, dept, desc in JOBS:
    job = models.Job(title=title, department=dept, description=desc, created_by=1, created_at=rnd_date(180))
    db.add(job)
    db.flush()
    criteria = CRITERIA_BY_DEPT.get(dept, CRITERIA_BY_DEPT["operations"])
    cv = models.CriteriaVersion(job_id=job.id, version=1, version_number=1, criteria_config=criteria, is_active=True, created_at=job.created_at)
    db.add(cv)
    job_objs.append(job)
db.commit()
print(f"  ✅ {len(job_objs)} jobs created")

# ─── 3. Candidates (120) ──────────────────────────────────────────────────────
FIRST = ["Alex","Jamie","Jordan","Morgan","Taylor","Casey","Riley","Cameron","Dakota","Skyler",
         "Avery","Quinn","Reese","Sage","Blake","Drew","Hayden","Logan","Parker","Rowan",
         "Emilia","Luca","Helena","Marco","Aisha","Ravi","Zara","Kai","Soren","Priya",
         "Ananya","Hiroshi","Mei","Ibrahim","Fatima","Carlos","Sofia","Olga","Andrei","Yuki",
         "Nadia","Ethan","Mia","Noah","Emma","Liam","Olivia","Benjamin","Ava","Elijah",
         "Charlotte","Mason","Amelia","Oliver","Harper","James","Evelyn","Aiden","Abigail","Lucas",
         "Ella","Jackson","Elizabeth","Sebastian","Camila","Mateo","Luna","Jack","Sofia2","Owen",
         "Layla","Theodore","Riley2","Henry","Aria","Samuel","Chloe","William","Penelope","Wyatt",
         "Grace","John","Zoey","David","Nora","Joseph","Lily","Daniel","Eleanor","Ryan","Hannah",
         "Jacob","Lillian","Nathan","Addison","Gabriel","Aubrey","Anthony","Ellie","Isaiah","Stella"]

LAST = ["Chen","Kim","Patel","Johnson","Williams","Brown","Jones","Garcia","Martinez","Davis",
        "Wilson","Anderson","Taylor","Thomas","Jackson","White","Harris","Martin","Thompson","Robinson",
        "Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores",
        "Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts",
        "Gonzalez","Phillips","Evans","Turner","Diaz","Parker","Collins","Edwards","Stewart","Sanchez",
        "Morris","Rogers","Reed","Cook","Bailey","Bell","Cooper","Richardson","Cox","Howard",
        "Ward","Peterson","Gray","Ramirez","James","Watson","Brooks","Kelly","Sanders","Price",
        "Barnes","Bennett","Wood","Hayes","Coleman","Rivera2","Jenkins","Perry","Long","Patterson",
        "Hughes","Flores2","Washington","Butler","Simmons","Foster","Gonzales","Bryant","Alexander","Russell",
        "Griffin","Diaz2","Hayes2","Myers","Ford","Hamilton","Graham","Sullivan","Wallace","Woods"]

SKILLS_POOL = {
    "engineering": ["Python","FastAPI","React","TypeScript","Node.js","PostgreSQL","Redis","Docker","Kubernetes","AWS","GCP","Terraform","Git","GraphQL","REST","SQL","MongoDB","Elasticsearch","Kafka","gRPC"],
    "ai_research":  ["PyTorch","TensorFlow","HuggingFace","scikit-learn","NumPy","Pandas","CUDA","MLflow","LangChain","OpenCV","NLTK","spaCy","Keras","XGBoost","Spark","R","Julia","JAX","Ray","DVC"],
    "product":      ["Figma","Jira","Amplitude","Mixpanel","SQL","A/B Testing","Roadmapping","OKRs","User Research","Confluence","Agile","Scrum","Product Analytics","Wireframing","Stakeholder Management"],
    "default":      ["Excel","PowerPoint","Slack","Salesforce","HubSpot","Zendesk","Google Analytics","SQL","Python","Leadership","Communication","Negotiation","Project Management","Agile"],
}

COMPANIES = ["Google","Meta","Amazon","Microsoft","Apple","Netflix","Stripe","Airbnb","Uber","Lyft",
             "Spotify","Shopify","Twilio","Datadog","Snowflake","Databricks","Scale AI","Hugging Face",
             "OpenAI","Anthropic","Mistral","Cohere","Inflection","Stability AI","Runway","Perplexity",
             "MongoDB","Elastic","HashiCorp","Confluent","Grafana","PagerDuty","Okta","Cloudflare",
             "Vercel","Netlify","Railway","Render","Neon","PlanetScale","Supabase","Appwrite",
             "TechCorp","StartupXYZ","InnovateLab","DigitalVentures","FutureSystems","NexGen","Apex Tech",
             "Quantum Solutions","Synapse AI","Neural Works","Byte Corp","CloudMatrix","DataFlow Inc"]

EDUCATIONS = [
    "B.S. Computer Science, MIT","B.S. Electrical Engineering, Stanford","M.S. Machine Learning, Carnegie Mellon",
    "Ph.D. Computer Science, UC Berkeley","B.Tech Computer Science, IIT Bombay","M.S. Data Science, University of Edinburgh",
    "B.S. Mathematics, Harvard","MBA, Wharton School","B.S. Information Systems, Georgia Tech",
    "M.S. Software Engineering, University of Washington","B.Sc Computer Science, University of Toronto",
    "MSc Artificial Intelligence, Oxford","B.Eng Software Engineering, ETH Zurich",
    "B.S. Statistics, UCLA","M.S. Human-Computer Interaction, CMU","BBA Finance, NYU Stern",
    "B.S. Economics, University of Michigan","JD Harvard Law School","M.S. Cybersecurity, George Mason",
    "B.S. Physics, Caltech",
]

print("Creating 120 candidates...")
candidate_objs = []
for i in range(120):
    first = FIRST[i % len(FIRST)]
    last = LAST[i % len(LAST)]
    dept = random.choice(list(SKILLS_POOL.keys()))
    pool = SKILLS_POOL.get(dept, SKILLS_POOL["default"])
    skills = random.sample(pool, min(random.randint(4, 9), len(pool)))
    exp = random.randint(1, 14)
    edu = random.choice(EDUCATIONS)
    co = random.sample(COMPANIES, random.randint(1, 3))
    role = random.choice(["Software Engineer","Senior SWE","Staff Engineer","Data Scientist","Product Manager",
                          "ML Engineer","DevOps Engineer","Marketing Manager","Sales AE","UX Designer",
                          "Finance Analyst","HR Manager","Research Scientist","Technical Lead","Engineering Manager"])
    name = f"{first} {last}"
    email = f"{first.lower()}.{last.lower()}{random.randint(10,99)}@{random.choice(['gmail','outlook','proton','yahoo'])}.com"
    structured = {
        "name": name, "email": email,
        "phone": f"+1-{random.randint(200,999)}-{random.randint(100,999)}-{random.randint(1000,9999)}",
        "skills": skills, "experience_years": exp, "education": edu,
        "current_role": role, "companies": co,
        "summary": f"Experienced {role} with {exp} years at companies including {', '.join(co[:2])}. Skilled in {', '.join(skills[:3])}.",
    }
    cand = models.Candidate(
        name=name, email=email,
        phone=structured["phone"],
        resume_path=f"./data/uploads/mock_{uuid.uuid4().hex[:8]}.pdf",
        structured_data=structured,
        parsed_text=f"Resume for {name}. Skills: {', '.join(skills)}. Experience: {exp} years. Education: {edu}."
    )
    db.add(cand)
    candidate_objs.append((cand, structured))
db.flush()
db.commit()
print(f"  ✅ 120 candidates created")

# ─── 4. Applications (150) ────────────────────────────────────────────────────
STATUSES_WEIGHTED = ["completed"]*75 + ["processing"]*10 + ["queued"]*10 + ["failed"]*5

VERDICT_REASONS = {
    "advance": ["Strong technical background matching all criteria","Excellent system design skills demonstrated","Prior experience directly relevant to this role","Outstanding portfolio and references","Clear culture fit and growth mindset"],
    "hold":    ["Meets most criteria but gaps in system design","Good communication but limited relevant experience","Strong technical skills but team fit unclear","Requires further evaluation on domain expertise","Borderline — recommend one more technical round"],
    "reject":  ["Significant gap in required technical skills","Experience level doesn't match seniority required","Communication skills insufficient for the role","Failed core domain knowledge assessment","References raised concerns about past performance"],
}

def make_score_breakdown(criteria, score):
    breakdown = []
    for c in criteria:
        w = c["weight"]
        s = max(10, min(100, int(score * 100 + random.gauss(0, 12))))
        verdict = "strong" if s >= 80 else "adequate" if s >= 60 else "weak" if s >= 40 else "missing"
        breakdown.append({
            "criterion": c["name"], "score": s, "weight": w,
            "evidence": f"Resume demonstrates {s}% alignment with {c['name']} requirements.",
            "verdict": verdict
        })
    rec = "advance" if score >= 0.65 else "hold" if score >= 0.45 else "reject"
    return {
        "final_score": round(score, 3),
        "breakdown": breakdown,
        "strengths": random.sample(["Strong technical depth","Relevant domain experience","Excellent communication","Clear analytical skills","Good culture fit","Leadership potential","Creative problem solver","Fast learner"], random.randint(2, 4)),
        "red_flags": random.sample(["Limited experience with required tools","Short tenure at previous companies","Salary expectations above band","Gaps in employment history",""], random.randint(0, 2)),
        "summary": random.choice(VERDICT_REASONS[rec]),
        "recommendation": rec,
    }

print("Creating 150 applications...")
app_objs = []
for i in range(150):
    job = random.choice(job_objs)
    cand, structured = random.choice(candidate_objs)
    dept = job.department
    criteria = CRITERIA_BY_DEPT.get(dept, CRITERIA_BY_DEPT["operations"])
    status = random.choice(STATUSES_WEIGHTED)
    score = pct_score() if coin(0.75) else low_score()
    rec_flag = score >= 0.72 and coin(0.85)
    breakdown = make_score_breakdown(criteria, score) if status == "completed" else None
    appl = models.Application(
        job_id=job.id, candidate_id=cand.id,
        status=status,
        resume_score=round(score, 3) if status == "completed" else None,
        recommendation_flag=rec_flag if status == "completed" else False,
        resume_structured_data=structured,
        score_breakdown=breakdown,
        created_at=rnd_date(60),
    )
    db.add(appl)
    app_objs.append((appl, job, cand, structured, criteria))
db.flush()
db.commit()
print(f"  ✅ 150 applications created")

# ─── 5. Interview sessions (80) ───────────────────────────────────────────────
TRANSCRIPT_TEMPLATES = [
    [("Interviewer","Tell me about your background and what brought you to this role."),
     ("Candidate","Sure! I've been working in software for {exp} years, mainly at {co}. I joined because the problem you're solving resonates deeply with me."),
     ("Interviewer","What's your experience with {skill1} and how have you used it in production?"),
     ("Candidate","I've used {skill1} extensively. For example, at {co} I built a system that processed 10M events per day using it."),
     ("Interviewer","Can you walk me through a system you designed from scratch?"),
     ("Candidate","Absolutely. At {co} we needed a real-time ranking system. I designed a microservice using {skill1} and {skill2}..."),
     ("Interviewer","How do you handle disagreements with team leads?"),
     ("Candidate","I believe in data-driven discussions. I document my reasoning, present trade-offs clearly, and ultimately respect the team's decision."),
     ("Interviewer","Where do you see yourself in 3 years?"),
     ("Candidate","I'd love to grow into a technical leadership role, mentoring others while still contributing to architecture decisions."),
     ("Interviewer","Do you have any questions for us?"),
     ("Candidate","Yes — how does your team approach technical debt? And what does success look like in the first 90 days?")],
    [("Interviewer","Start by giving me your elevator pitch."),
     ("Candidate","I'm a {role} with {exp} years of experience. I specialize in {skill1} and have shipped products used by millions."),
     ("Interviewer","Describe a time you failed and what you learned."),
     ("Candidate","At {co}, I underestimated the complexity of a migration. We missed the deadline by two weeks. I learned to always add 40% buffer and involve infra early."),
     ("Interviewer","How do you prioritize when everything is urgent?"),
     ("Candidate","I use an impact-effort matrix. I align with stakeholders on business goals, then sequence work accordingly."),
     ("Interviewer","What's your approach to code reviews?"),
     ("Candidate","I focus on correctness first, then readability, then performance. I try to ask questions rather than make assertions."),
     ("Interviewer","Tell me about a time you influenced a decision without authority."),
     ("Candidate","I created a small proof-of-concept with benchmarks that convinced the team to adopt {skill2}. The switch reduced latency by 60%."),],
]

SUGGESTIONS_POOL = [
    [{"question":"Can you give a concrete example of debugging a production outage?","priority":"HIGH","rationale":"Tests incident response skills","criterion":"Technical Depth"},
     {"question":"How would you design a rate limiter at 1M req/s?","priority":"HIGH","rationale":"Tests system design under scale","criterion":"System Design"},
     {"question":"Walk me through your last code review catch that prevented a bug in prod.","priority":"MEDIUM","rationale":"Tests code quality mindset","criterion":"Code Quality"}],
    [{"question":"How do you measure the success of a feature after shipping?","priority":"HIGH","rationale":"Tests data-driven mindset","criterion":"Product Thinking"},
     {"question":"Describe your roadmap prioritization framework.","priority":"HIGH","rationale":"Tests strategic thinking","criterion":"Stakeholder Management"},
     {"question":"Tell me about a time you made a hard trade-off between UX and engineering effort.","priority":"MEDIUM","rationale":"Tests cross-functional collaboration","criterion":"Communication"}],
]

EVAL_POOL = [
    {"interview_score":0.88,"criterion_scores":[{"criterion":"Technical Depth","score":92,"evidence":"Candidate described Redis pub/sub architecture with impressive detail","consistency_with_resume":"consistent","verdict":"strong"},{"criterion":"System Design","score":85,"evidence":"Walked through microservice design clearly","consistency_with_resume":"consistent","verdict":"strong"}],"strengths_demonstrated":["Deep technical knowledge","Excellent communication","Strong problem-solving"],"red_flags":[],"consistency_score":0.93,"communication_score":88,"key_insights":"The candidate demonstrated outstanding depth across all evaluated criteria. Their real-world examples were specific and credible. Strong recommend to advance.","recommendation":"advance"},
    {"interview_score":0.71,"criterion_scores":[{"criterion":"Technical Depth","score":72,"evidence":"Good understanding but some gaps in distributed systems","consistency_with_resume":"consistent","verdict":"adequate"},{"criterion":"System Design","score":68,"evidence":"Reasonable answer but didn't consider failure modes","consistency_with_resume":"not_covered","verdict":"adequate"}],"strengths_demonstrated":["Good communication","Relevant domain experience"],"red_flags":["Vague on production scale","Salary expectations high"],"consistency_score":0.78,"communication_score":82,"key_insights":"Solid candidate with a few gaps. Would benefit from a system design deep-dive in round 2. Recommend hold pending additional evaluation.","recommendation":"hold"},
    {"interview_score":0.45,"criterion_scores":[{"criterion":"Technical Depth","score":42,"evidence":"Struggled with basic API design questions","consistency_with_resume":"inconsistent","verdict":"weak"},{"criterion":"System Design","score":38,"evidence":"Could not articulate trade-offs in database selection","consistency_with_resume":"inconsistent","verdict":"missing"}],"strengths_demonstrated":["Good attitude","Growth mindset"],"red_flags":["Resume overstates experience","Failed core technical question","Inconsistent with claimed skills"],"consistency_score":0.45,"communication_score":65,"key_insights":"The candidate's interview performance was significantly below the level implied by their resume. Core technical questions were answered incorrectly. Recommend rejection.","recommendation":"reject"},
]

print("Creating 80 interview sessions...")
sess_objs = []
eligible = [(a, j, c, s, cr) for a, j, c, s, cr in app_objs if a.status == "completed"]
session_sample = random.sample(eligible, min(80, len(eligible)))

for appl, job, cand, structured, criteria in session_sample:
    tmpl = random.choice(TRANSCRIPT_TEMPLATES)
    sugg = random.choice(SUGGESTIONS_POOL)
    exp = structured.get("experience_years", 3)
    skills = structured.get("skills", ["Python"])
    co_list = structured.get("companies", ["TechCorp"])
    transcript = []
    for spkr, txt in tmpl:
        filled = txt.format(exp=exp, co=co_list[0] if co_list else "TechCorp",
                            skill1=skills[0] if skills else "Python",
                            skill2=skills[1] if len(skills) > 1 else "Docker",
                            role=structured.get("current_role","Engineer"))
        transcript.append({"speaker": spkr, "text": filled, "timestamp": f"{random.randint(10,11)}:{random.randint(10,59):02d}:{random.randint(0,59):02d}"})

    started = rnd_date(45)
    ended = started + timedelta(minutes=random.randint(25, 65))
    room = f"talentai-interview-{appl.id}-{uuid.uuid4().hex[:8]}"
    sess = models.InterviewSession(
        application_id=appl.id,
        meet_link=f"https://meet.jit.si/{room}",
        jitsi_room=room,
        transcript_data=transcript,
        ai_suggestions=sugg,
        status="completed",
        started_at=started,
        ended_at=ended,
    )
    db.add(sess)
    db.flush()
    sess_objs.append((sess, appl, job, cand, structured, criteria))
db.commit()
print(f"  ✅ {len(sess_objs)} interview sessions created")

# ─── 6. Scorecards (65) ───────────────────────────────────────────────────────
print("Creating scorecards + post-interview evaluations...")
sc_count = 0
eval_objs = []
for i, (sess, appl, job, cand, structured, criteria) in enumerate(sess_objs[:65]):
    eval_data = EVAL_POOL[i % len(EVAL_POOL)].copy()
    # Personalise scores slightly
    eval_data["interview_score"] = round(eval_data["interview_score"] + random.gauss(0, 0.06), 3)
    eval_data["interview_score"] = max(0.2, min(0.98, eval_data["interview_score"]))
    appl.interview_evaluation = eval_data

    sc = models.InterviewScorecard(
        interview_session_id=sess.id,
        overall_score=eval_data["interview_score"],
        criterion_scores=eval_data.get("criterion_scores", {}),
        strengths=", ".join(eval_data.get("strengths_demonstrated", [])),
        weaknesses=", ".join(eval_data.get("red_flags", [])),
        risk_flags=""
    )
    db.add(sc)
    eval_objs.append((sess, appl, job, cand, structured, eval_data))
    sc_count += 1
db.flush()
db.commit()
print(f"  ✅ {sc_count} scorecards created")

# ─── 7. Final evaluations (55) ────────────────────────────────────────────────
print("Creating final evaluations...")
fe_count = 0
NARRATIVES = {
    "ACCEPT": [
        "This candidate demonstrated exceptional proficiency across all evaluated dimensions. Their technical depth, real-world examples, and communication quality all exceeded the bar for this role. We strongly recommend proceeding to offer stage.",
        "An outstanding performance both on resume and in the interview. The candidate's experience directly maps to our technical requirements and culture values. Recommend fast-tracking the offer to avoid losing them to competing opportunities.",
    ],
    "HOLD": [
        "The candidate shows genuine promise and meets the core requirements but left some questions unanswered regarding advanced technical topics. We recommend a second technical round focused on system design before making a final call.",
        "Solid candidate with relevant background, but the interview surfaced some gaps in their claimed experience. Worth keeping in the pipeline but not a first-choice offer yet.",
    ],
    "REJECT": [
        "Despite an impressive resume, the live interview revealed significant inconsistencies in the candidate's claimed skill set. Core technical questions were answered incorrectly and the team does not recommend proceeding.",
        "The candidate does not meet the minimum bar for this role at this time. Their experience level and technical depth are below what is required. We recommend revisiting if they acquire 2+ more years of relevant experience.",
    ]
}

for i, (sess, appl, job, cand, structured, eval_data) in enumerate(eval_objs[:55]):
    res_score = float(appl.resume_score or 0.65)
    int_score = eval_data["interview_score"]
    irr = round(random.uniform(0.25, 1.0), 2)
    final = round(res_score * 0.30 + int_score * 0.50 + irr * 0.20, 4)
    if final >= 0.75:
        verdict = "ACCEPT"
    elif final >= 0.50:
        verdict = "HOLD"
    else:
        verdict = "REJECT"
    narrative = random.choice(NARRATIVES[verdict])
    result = {
        "verdict": verdict,
        "verdict_color": {"ACCEPT":"#22C55E","HOLD":"#F59E0B","REJECT":"#EF4444"}[verdict],
        "final_score": final,
        "final_score_pct": round(final * 100, 1),
        "action": {"ACCEPT":"Proceed to offer stage","HOLD":"Consider additional evaluation round","REJECT":"Send polite rejection email"}[verdict],
        "component_scores": {"resume": res_score, "interview": int_score, "interviewer_rating": irr},
        "weights": {"resume": 0.30, "interview": 0.50, "interviewer": 0.20},
        "strengths": eval_data.get("strengths_demonstrated", [])[:4],
        "red_flags": eval_data.get("red_flags", [])[:3],
        "narrative": narrative,
    }
    appl.final_assessment = result
    fe = models.FinalEvaluation(
        application_id=appl.id,
        resume_score=res_score,
        interview_score=int_score,
        subjective_score=irr,
        final_score=final,
        verdict=verdict,
        recommendation=verdict,
        summary=narrative,
        full_assessment=result,
    )
    db.add(fe)
    fe_count += 1
db.flush()
db.commit()
print(f"  ✅ {fe_count} final evaluations created")

# ─── Summary ──────────────────────────────────────────────────────────────────
from sqlalchemy import func
print("\n" + "="*50)
print("🌱 SEED COMPLETE — Database Summary")
print("="*50)
print(f"  Jobs:              {db.query(models.Job).count()}")
print(f"  Criteria versions: {db.query(models.CriteriaVersion).count()}")
print(f"  Candidates:        {db.query(models.Candidate).count()}")
print(f"  Applications:      {db.query(models.Application).count()}")
print(f"    completed:       {db.query(models.Application).filter(models.Application.status=='completed').count()}")
print(f"    recommended:     {db.query(models.Application).filter(models.Application.recommendation_flag==True).count()}")
print(f"  Interview sessions:{db.query(models.InterviewSession).count()}")
print(f"  Scorecards:        {db.query(models.InterviewScorecard).count()}")
print(f"  Final evaluations: {db.query(models.FinalEvaluation).count()}")
verdicts = db.query(models.FinalEvaluation.verdict, func.count()).group_by(models.FinalEvaluation.verdict).all()
for v, cnt in verdicts:
    print(f"    {v}: {cnt}")
print("="*50)
db.close()
