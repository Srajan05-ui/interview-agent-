# Extended Post-Interview Features Implementation Plan

This document outlines the architectural and UI changes necessary to implement advanced resume analysis, day-wise roadmap generation, and job search integrations.

## User Review Required

> [!IMPORTANT]  
> Please review the proposed endpoints and UI flows. Since we are integrating heavily with the local Ollama model (`qwen2.5-coder`), some operations like ATS Resume rewrite and Roadmap Generation might take 10-30 seconds depending on the model's speed. Let me know if you want to stream these responses or show a loading state.

## Open Questions

> [!WARNING]  
> - For the ATS Resume Maker, do you want the AI to return a raw text/markdown format of the improved resume, or do you want it formatted as a downloadable PDF/DOCX (which requires additional backend libraries like `reportlab` or `python-docx`)? For now, I will assume a rich text Markdown display in the UI with a "Copy" button.
> - For job searching, I will generate dynamic URL links to LinkedIn and Naukri using the extracted skills (e.g., `https://www.linkedin.com/jobs/search/?keywords=Python%20React`). Does this approach work for you?

## Proposed Changes

---

### Backend Components

#### [MODIFY] `backend/app/api/routes.py`
We will expand the API to support the new AI-driven features.
- **ATS Resume Scoring:** Update `/api/resume/upload` (or add a new `/api/resume/analyze`) to use Ollama to grade the resume against ATS standards, returning a score out of 100, suggestions for improvement, and the extracted skills.
- **ATS Resume Maker:** Add a new endpoint `POST /api/resume/improve` that takes the raw resume text and uses Ollama to rewrite it into a highly professional, ATS-optimized format.
- **Roadmap Generation:** Add `POST /api/roadmap/generate` which takes the `weak_areas` from the interview evaluation and generates a structured day-wise or week-wise learning plan.

---

### Frontend Components

#### [MODIFY] `frontend/src/components/CandidateSetup.jsx`
- Remove the manual "Candidate ID" input field entirely.
- Automatically assign a UUID or use the logged-in Firebase user's email/UID as the candidate ID to streamline the setup process.
- Show the ATS Score immediately after the resume is uploaded, along with feedback on whether it is "up to level".

#### [MODIFY] `frontend/src/services/api.js`
- Add API bindings for `generateRoadmap` and `improveResume`.

#### [MODIFY] `frontend/src/components/ResultsDashboard.jsx`
This component will be completely overhauled into a multi-tab or highly structured dashboard:
- **Tab 1: Scorecard & Feedback (Existing but improved)**
  - Detailed breakdown of the interview performance, strong areas, and weak points.
- **Tab 2: AI Learning Roadmap (New)**
  - A "Generate Roadmap" button.
  - Once generated, displays a structured timeline (Day 1, Day 2, etc.) focusing heavily on the candidate's weak areas.
- **Tab 3: ATS Resume Maker (New)**
  - If the initial ATS score was low, this section allows the user to click "Generate ATS-Friendly Resume".
  - Displays the AI-rewritten resume.
- **Tab 4: Job Search (New)**
  - Buttons that take the user's top skills (e.g., React, Python) and generate direct search links for LinkedIn Jobs and Naukri.com.

#### [MODIFY] `frontend/src/index.css`
- Add styling for the new roadmap timeline UI, the ATS score gauge, and job search cards.

## Verification Plan

### Manual Verification
1. **Setup Flow:** Start the app, log in, and verify the Candidate ID field is gone. Upload a sample PDF resume and wait for the ATS Score to appear.
2. **ATS Maker:** Click the "Improve Resume" option and verify the rewritten output is professional.
3. **Roadmap:** Complete a short interview, navigate to the Results Dashboard, click "Generate Roadmap", and verify the day-wise plan focuses on the weak points identified during the interview.
4. **Job Search:** Verify the LinkedIn and Naukri buttons open new tabs with the correct skill keywords in the query parameters.
