// TalentConnect Intake Question Library
// Organized by org type and attribute
// Every question earned from real searches — not templates

export type OrgType =
  | 'startup'
  | 'growth_pe'
  | 'established_private'
  | 'public_company'
  | 'nonprofit'
  | 'public_sector'

export type QuestionAttribute =
  | 'business_context'
  | 'governance_leadership'
  | 'team_culture'
  | 'mission_alignment'
  | 'failure_pattern'
  | 'hidden_disqualifier'
  | 'success_picture'
  | 'decision_making'

export interface IntakeQuestion {
  id: string
  text: string
  attribute: QuestionAttribute
  orgTypes: OrgType[]
  universal?: boolean
  isProbe?: boolean
}

export const DECISION_MAKING_QUESTIONS: IntakeQuestion[] = [
  { id: 'dm_1', text: "What's the pace of decision-making here and what drives it?", attribute: 'decision_making', orgTypes: [], universal: true },
  { id: 'dm_2', text: "How does this role make decisions when there's no consensus and no playbook?", attribute: 'decision_making', orgTypes: [], universal: true },
  { id: 'dm_3', text: "What does this person own completely — and where do they need to build buy-in first?", attribute: 'decision_making', orgTypes: [], universal: true },
  { id: 'dm_4', text: "What does this organization say no to — and who has the authority to say it?", attribute: 'decision_making', orgTypes: [], universal: true, isProbe: true },
  { id: 'dm_5', text: "Tell me about a recent decision in this role that was hard. How did it get made?", attribute: 'decision_making', orgTypes: [], universal: true },
  { id: 'dm_6', text: "What happens here when someone makes the wrong call — is that a career moment or a learning moment?", attribute: 'decision_making', orgTypes: [], universal: true },
  { id: 'dm_7', text: "What kind of decision-maker has failed in this environment and why?", attribute: 'decision_making', orgTypes: [], universal: true, isProbe: true },
]

export const STARTUP_QUESTIONS: IntakeQuestion[] = [
  { id: 'su_bc_1', text: "Where are you in product market fit — honest answer?", attribute: 'business_context', orgTypes: ['startup'] },
  { id: 'su_bc_2', text: "What does the runway look like and what does this hire need to know about it?", attribute: 'business_context', orgTypes: ['startup'], isProbe: true },
  { id: 'su_bc_3', text: "What has to be true in the next 18 months for this company to win?", attribute: 'business_context', orgTypes: ['startup'] },
  { id: 'su_bc_4', text: "What's the biggest thing that could derail you that has nothing to do with product?", attribute: 'business_context', orgTypes: ['startup'] },
  { id: 'su_gl_1', text: "How does the founder make decisions — data, gut, or consensus?", attribute: 'governance_leadership', orgTypes: ['startup'], isProbe: true },
  { id: 'su_gl_2', text: "Where does this role have real authority and where does it need to check in?", attribute: 'governance_leadership', orgTypes: ['startup'] },
  { id: 'su_gl_3', text: "Has the company transitioned from founder-led to professionally managed — or is that the transition this hire needs to lead?", attribute: 'governance_leadership', orgTypes: ['startup'] },
  { id: 'su_gl_4', text: "Who else is in the leadership team and how long have they been here?", attribute: 'governance_leadership', orgTypes: ['startup'] },
  { id: 'su_tc_1', text: "What does scrappy actually mean here — give me an example?", attribute: 'team_culture', orgTypes: ['startup'], isProbe: true },
  { id: 'su_tc_2', text: "What's the difference between someone who thrives here and someone who came from a bigger company and couldn't adapt?", attribute: 'team_culture', orgTypes: ['startup'] },
  { id: 'su_tc_3', text: "What does this place ask of people at 9pm on a Tuesday?", attribute: 'team_culture', orgTypes: ['startup'] },
  { id: 'su_tc_4', text: "Who on the team is struggling with the pace and why?", attribute: 'team_culture', orgTypes: ['startup'] },
  { id: 'su_ma_1', text: "Why does this company exist beyond making money — and do you believe it?", attribute: 'mission_alignment', orgTypes: ['startup'], isProbe: true },
  { id: 'su_ma_2', text: "What would a great candidate find genuinely exciting about this problem you're solving?", attribute: 'mission_alignment', orgTypes: ['startup'] },
  { id: 'su_ma_3', text: "What kind of person gets energized by uncertainty rather than destabilized by it?", attribute: 'mission_alignment', orgTypes: ['startup'] },
  { id: 'su_fp_1', text: "What happened to the last person in this role?", attribute: 'failure_pattern', orgTypes: ['startup'], isProbe: true },
  { id: 'su_fp_2', text: "Have you hired someone from a big company for a role like this before — what happened?", attribute: 'failure_pattern', orgTypes: ['startup'] },
  { id: 'su_fp_3', text: "What's the hire you regret most and what did you learn from it?", attribute: 'failure_pattern', orgTypes: ['startup'] },
  { id: 'su_fp_4', text: "What does someone do in month two that makes you realize you got it wrong?", attribute: 'failure_pattern', orgTypes: ['startup'] },
  { id: 'su_hd_1', text: "What behavior would sideline someone here that would be totally fine at Google or McKinsey?", attribute: 'hidden_disqualifier', orgTypes: ['startup'], isProbe: true },
  { id: 'su_hd_2', text: "What does this role ask of someone's ego that the job description doesn't say?", attribute: 'hidden_disqualifier', orgTypes: ['startup'] },
  { id: 'su_hd_3', text: "Is there a type of smart that doesn't work here?", attribute: 'hidden_disqualifier', orgTypes: ['startup'], isProbe: true },
  { id: 'su_sp_1', text: "A year from now this person has changed something fundamental. What is it?", attribute: 'success_picture', orgTypes: ['startup'] },
  { id: 'su_sp_2', text: "What does the team look like because they were in it?", attribute: 'success_picture', orgTypes: ['startup'] },
  { id: 'su_sp_3', text: "What did they build that didn't exist before they got here?", attribute: 'success_picture', orgTypes: ['startup'] },
]

export const GROWTH_PE_QUESTIONS: IntakeQuestion[] = [
  { id: 'pe_bc_1', text: "What does the board expect this hire to deliver in the next 12 months?", attribute: 'business_context', orgTypes: ['growth_pe'] },
  { id: 'pe_bc_2', text: "Where is the business in its professionalization journey — what's still founder-built that needs to be institutionalized?", attribute: 'business_context', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_bc_3', text: "What's the EBITDA story and what pressure does that create for this role?", attribute: 'business_context', orgTypes: ['growth_pe'] },
  { id: 'pe_bc_4', text: "What does the PE firm care about that the operating team sometimes pushes back on?", attribute: 'business_context', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_gl_1', text: "How involved is the PE firm in day to day decisions?", attribute: 'governance_leadership', orgTypes: ['growth_pe'] },
  { id: 'pe_gl_2', text: "Who has the real authority here — operating CEO or the board?", attribute: 'governance_leadership', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_gl_3', text: "Has the leadership team changed significantly since the investment?", attribute: 'governance_leadership', orgTypes: ['growth_pe'] },
  { id: 'pe_gl_4', text: "What's the relationship between the founder and the new management structure?", attribute: 'governance_leadership', orgTypes: ['growth_pe'] },
  { id: 'pe_tc_1', text: "What's the culture collision happening right now between the old guard and new leadership?", attribute: 'team_culture', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_tc_2', text: "Who on the team is a flight risk and why?", attribute: 'team_culture', orgTypes: ['growth_pe'] },
  { id: 'pe_tc_3', text: "What does this place ask of people that a pre-PE environment didn't?", attribute: 'team_culture', orgTypes: ['growth_pe'] },
  { id: 'pe_tc_4', text: "What's the unspoken tension in the leadership team right now?", attribute: 'team_culture', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_ma_1', text: "Beyond the financial return — what does this company stand for that someone would actually care about?", attribute: 'mission_alignment', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_ma_2', text: "What kind of person gets energized by a performance culture without losing themselves in it?", attribute: 'mission_alignment', orgTypes: ['growth_pe'] },
  { id: 'pe_ma_3', text: "Is there a mission here or is this purely a value creation story — be honest?", attribute: 'mission_alignment', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_fp_1', text: "What happened to the last person in this role?", attribute: 'failure_pattern', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_fp_2', text: "Have you brought in someone from a larger institutional environment who couldn't operate here — what happened?", attribute: 'failure_pattern', orgTypes: ['growth_pe'] },
  { id: 'pe_fp_3', text: "What does a great resume look like on paper but fail in this environment?", attribute: 'failure_pattern', orgTypes: ['growth_pe'] },
  { id: 'pe_fp_4', text: "What did the PE firm push for in a hire that turned out to be wrong?", attribute: 'failure_pattern', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_hd_1', text: "What behavior would sideline someone here that would be fine in a pre-PE environment?", attribute: 'hidden_disqualifier', orgTypes: ['growth_pe'] },
  { id: 'pe_hd_2', text: "What does this role ask of someone's relationship with ambiguity and pressure?", attribute: 'hidden_disqualifier', orgTypes: ['growth_pe'] },
  { id: 'pe_hd_3', text: "Is there a leadership style that the PE firm thinks works but actually doesn't here?", attribute: 'hidden_disqualifier', orgTypes: ['growth_pe'], isProbe: true },
  { id: 'pe_sp_1', text: "What does this business look like at exit because this person was in it?", attribute: 'success_picture', orgTypes: ['growth_pe'] },
  { id: 'pe_sp_2', text: "What did they build that made the company more valuable — not just financially?", attribute: 'success_picture', orgTypes: ['growth_pe'] },
  { id: 'pe_sp_3', text: "What's the thing the leadership team couldn't do without them that they can do now?", attribute: 'success_picture', orgTypes: ['growth_pe'] },
]

export const ESTABLISHED_PRIVATE_QUESTIONS: IntakeQuestion[] = [
  { id: 'ep_bc_1', text: "How does the business make money and has that model changed recently?", attribute: 'business_context', orgTypes: ['established_private'] },
  { id: 'ep_bc_2', text: "What's the growth ambition — stay private and profitable, scale, or eventually sell?", attribute: 'business_context', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_bc_3', text: "What does financial success look like here beyond the numbers?", attribute: 'business_context', orgTypes: ['established_private'] },
  { id: 'ep_bc_4', text: "What's the thing the business has never been able to crack that this hire needs to fix?", attribute: 'business_context', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_gl_1', text: "How does the founder make decisions — and has that changed as the business has grown?", attribute: 'governance_leadership', orgTypes: ['established_private'] },
  { id: 'ep_gl_2', text: "Where does this role have real authority and where does the founder retain control?", attribute: 'governance_leadership', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_gl_3', text: "How has the business handled outside leadership before — what worked, what didn't?", attribute: 'governance_leadership', orgTypes: ['established_private'] },
  { id: 'ep_gl_4', text: "Who else needs to buy into this hire beyond the founder?", attribute: 'governance_leadership', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_tc_1', text: "How long has the core team been here — and what does that tell you about the culture?", attribute: 'team_culture', orgTypes: ['established_private'] },
  { id: 'ep_tc_2', text: "What does loyalty mean in this organization — how is it expressed and rewarded?", attribute: 'team_culture', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_tc_3', text: "What's the unwritten rule here that every long-tenured employee knows but nobody says out loud?", attribute: 'team_culture', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_tc_4', text: "What does this place ask of people that a corporate environment never would?", attribute: 'team_culture', orgTypes: ['established_private'] },
  { id: 'ep_ma_1', text: "What does this company stand for beyond the product or service?", attribute: 'mission_alignment', orgTypes: ['established_private'] },
  { id: 'ep_ma_2', text: "What's the founder's original vision and is it still alive in the culture?", attribute: 'mission_alignment', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_ma_3', text: "What kind of person finds meaning in building something that lasts versus something that exits?", attribute: 'mission_alignment', orgTypes: ['established_private'] },
  { id: 'ep_fp_1', text: "What happened to the last person in this role?", attribute: 'failure_pattern', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_fp_2', text: "Have you brought in someone from a corporate background before — what happened?", attribute: 'failure_pattern', orgTypes: ['established_private'] },
  { id: 'ep_fp_3', text: "What did they do that felt completely normal to them but landed wrong here?", attribute: 'failure_pattern', orgTypes: ['established_private'] },
  { id: 'ep_fp_4', text: "What does the team do when they don't trust an outside hire?", attribute: 'failure_pattern', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_hd_1', text: "What behavior would sideline someone here that would be completely normal in a corporate environment?", attribute: 'hidden_disqualifier', orgTypes: ['established_private'] },
  { id: 'ep_hd_2', text: "What does this role ask of someone's ego — because the founder's name is still on the door?", attribute: 'hidden_disqualifier', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_hd_3', text: "Is there a way of being that the family would never accept regardless of performance?", attribute: 'hidden_disqualifier', orgTypes: ['established_private'] },
  { id: 'ep_sp_1', text: "Two years from now this person has earned the founder's trust completely. What did they do to get there?", attribute: 'success_picture', orgTypes: ['established_private'], isProbe: true },
  { id: 'ep_sp_2', text: "What did they build that the founder couldn't have built alone?", attribute: 'success_picture', orgTypes: ['established_private'] },
  { id: 'ep_sp_3', text: "How did the culture change because they were in it — and did it stay true to what made this place what it is?", attribute: 'success_picture', orgTypes: ['established_private'] },
]

export const PUBLIC_COMPANY_QUESTIONS: IntakeQuestion[] = [
  { id: 'pub_bc_1', text: "What's the narrative the street is buying right now — and is it accurate?", attribute: 'business_context', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_bc_2', text: "Where is the gap between what gets reported publicly and what's actually happening operationally?", attribute: 'business_context', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_bc_3', text: "What's the board's biggest concern about the business that doesn't show up in the 10-K?", attribute: 'business_context', orgTypes: ['public_company'] },
  { id: 'pub_bc_4', text: "What has to be true in the next two quarters for leadership to feel good about this hire's timing?", attribute: 'business_context', orgTypes: ['public_company'] },
  { id: 'pub_gl_1', text: "How does the board engage with this role — oversight, active involvement, or hands off?", attribute: 'governance_leadership', orgTypes: ['public_company'] },
  { id: 'pub_gl_2', text: "What's the dynamic between the CEO and the board right now?", attribute: 'governance_leadership', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_gl_3', text: "How much of this role is internal leadership versus external facing — analysts, investors, press?", attribute: 'governance_leadership', orgTypes: ['public_company'] },
  { id: 'pub_gl_4', text: "Who else in the C-suite has influence over this hire's success?", attribute: 'governance_leadership', orgTypes: ['public_company'] },
  { id: 'pub_tc_1', text: "What's the culture underneath the investor relations language — what's it actually like?", attribute: 'team_culture', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_tc_2', text: "What does performance pressure look like day to day in this environment?", attribute: 'team_culture', orgTypes: ['public_company'] },
  { id: 'pub_tc_3', text: "What's the gap between the employer brand and the reality of working here?", attribute: 'team_culture', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_tc_4', text: "Who thrives in a fishbowl environment and who burns out?", attribute: 'team_culture', orgTypes: ['public_company'] },
  { id: 'pub_ma_1', text: "Beyond shareholder value — what does this company stand for that someone would actually care about?", attribute: 'mission_alignment', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_ma_2', text: "What kind of person finds meaning in building something at scale under public scrutiny?", attribute: 'mission_alignment', orgTypes: ['public_company'] },
  { id: 'pub_ma_3', text: "Has the company ever chosen mission over margin — and how was that received by the board?", attribute: 'mission_alignment', orgTypes: ['public_company'] },
  { id: 'pub_fp_1', text: "What happened to the last person in this role?", attribute: 'failure_pattern', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_fp_2', text: "Have you brought in someone from a private environment who couldn't adjust to public company pace and scrutiny — what happened?", attribute: 'failure_pattern', orgTypes: ['public_company'] },
  { id: 'pub_fp_3', text: "What does a great operator look like on paper but fail in this environment?", attribute: 'failure_pattern', orgTypes: ['public_company'] },
  { id: 'pub_fp_4', text: "What did the board push for in a hire that turned out to be wrong?", attribute: 'failure_pattern', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_hd_1', text: "What behavior would sideline someone here that would be completely fine in a private company?", attribute: 'hidden_disqualifier', orgTypes: ['public_company'] },
  { id: 'pub_hd_2', text: "What does this role ask of someone's relationship with public scrutiny and political navigation?", attribute: 'hidden_disqualifier', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_hd_3', text: "Is there a leadership style that plays well externally but destroys trust internally?", attribute: 'hidden_disqualifier', orgTypes: ['public_company'], isProbe: true },
  { id: 'pub_sp_1', text: "Two years from now this person has changed something material about how this company operates. What is it?", attribute: 'success_picture', orgTypes: ['public_company'] },
  { id: 'pub_sp_2', text: "What did they do that showed up in the business results — not just the org chart?", attribute: 'success_picture', orgTypes: ['public_company'] },
  { id: 'pub_sp_3', text: "Two years from now the board has full confidence in this leadership team. What did this person do to get them there?", attribute: 'success_picture', orgTypes: ['public_company'] },
]

export const NONPROFIT_QUESTIONS: IntakeQuestion[] = [
  { id: 'np_bc_1', text: "What's the funding picture right now — grants, government contracts, donors, earned revenue? How stable is it?", attribute: 'business_context', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_bc_2', text: "What's the macro environment doing to your funding — are there threats on the horizon this hire needs to walk into eyes open?", attribute: 'business_context', orgTypes: ['nonprofit'] },
  { id: 'np_bc_3', text: "How dependent is the organization on any single funding source?", attribute: 'business_context', orgTypes: ['nonprofit'] },
  { id: 'np_bc_4', text: "What's the growth trajectory — expanding programs, holding steady, or navigating contraction?", attribute: 'business_context', orgTypes: ['nonprofit'] },
  { id: 'np_gl_1', text: "How engaged is the board in day to day operations — and is that the right level?", attribute: 'governance_leadership', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_gl_2', text: "Who has the real influence here — staff leadership, board, or major funders?", attribute: 'governance_leadership', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_gl_3', text: "How does the board define success for this role?", attribute: 'governance_leadership', orgTypes: ['nonprofit'] },
  { id: 'np_gl_4', text: "Where does this role have autonomy and where does it need to build consensus?", attribute: 'governance_leadership', orgTypes: ['nonprofit'] },
  { id: 'np_tc_1', text: "What's the staff culture — people stay because of mission, compensation, leadership, or all three?", attribute: 'team_culture', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_tc_2', text: "What's the turnover story — who leaves and why?", attribute: 'team_culture', orgTypes: ['nonprofit'] },
  { id: 'np_tc_3', text: "What does this organization ask of its people that a for-profit wouldn't?", attribute: 'team_culture', orgTypes: ['nonprofit'] },
  { id: 'np_tc_4', text: "Where is the tension in the organization right now?", attribute: 'team_culture', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_ma_1', text: "Can you tell me why this mission matters to you personally — not the org's language, yours?", attribute: 'mission_alignment', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_ma_2', text: "What kind of person finds this work meaningful versus just professionally interesting?", attribute: 'mission_alignment', orgTypes: ['nonprofit'] },
  { id: 'np_ma_3', text: "Has the organization ever had to compromise the mission for sustainability — and how was that handled?", attribute: 'mission_alignment', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_fp_1', text: "Tell me about a leadership hire that didn't work here. What did you miss?", attribute: 'failure_pattern', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_fp_2', text: "What does a smart, experienced person get wrong about this organization in the first six months?", attribute: 'failure_pattern', orgTypes: ['nonprofit'] },
  { id: 'np_fp_3', text: "What assumption do outside candidates make about nonprofit work that kills them here?", attribute: 'failure_pattern', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_hd_1', text: "What behavior would sideline someone here that would be totally fine somewhere else?", attribute: 'hidden_disqualifier', orgTypes: ['nonprofit'] },
  { id: 'np_hd_2', text: "What does this role ask of someone's character that the job description doesn't capture?", attribute: 'hidden_disqualifier', orgTypes: ['nonprofit'], isProbe: true },
  { id: 'np_hd_3', text: "Is there a for-profit mindset that works everywhere else but fails here?", attribute: 'hidden_disqualifier', orgTypes: ['nonprofit'] },
  { id: 'np_sp_1', text: "Two years from now this person has transformed something. What is it?", attribute: 'success_picture', orgTypes: ['nonprofit'] },
  { id: 'np_sp_2', text: "What does the organization look like because they were in it?", attribute: 'success_picture', orgTypes: ['nonprofit'] },
  { id: 'np_sp_3', text: "What's the thing the team is currently unable to do that this person makes possible?", attribute: 'success_picture', orgTypes: ['nonprofit'] },
]

export const PUBLIC_SECTOR_QUESTIONS: IntakeQuestion[] = [
  { id: 'ps_bc_1', text: "What's the funding picture right now — stable, at risk, or expanding?", attribute: 'business_context', orgTypes: ['public_sector'] },
  { id: 'ps_bc_2', text: "What policy or budget decisions in the next 12 months could materially affect this organization?", attribute: 'business_context', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_bc_3', text: "What does the organization do when a major funding source disappears?", attribute: 'business_context', orgTypes: ['public_sector'] },
  { id: 'ps_bc_4', text: "What's the thing happening in your sector right now that keeps you up at night?", attribute: 'business_context', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_gl_1', text: "How does the board engage — policy oversight, fundraising, or operational involvement?", attribute: 'governance_leadership', orgTypes: ['public_sector'] },
  { id: 'ps_gl_2', text: "Who are the key external stakeholders this role needs to build relationships with?", attribute: 'governance_leadership', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_gl_3', text: "What's the dynamic between the government funders and the operational leadership?", attribute: 'governance_leadership', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_gl_4', text: "Where does this role have autonomy and where does it need to navigate political constraints?", attribute: 'governance_leadership', orgTypes: ['public_sector'] },
  { id: 'ps_tc_1', text: "What's the culture — mission-driven nonprofit, quasi-government, or something else entirely?", attribute: 'team_culture', orgTypes: ['public_sector'] },
  { id: 'ps_tc_2', text: "What does this organization ask of people that a for-profit or pure nonprofit wouldn't?", attribute: 'team_culture', orgTypes: ['public_sector'] },
  { id: 'ps_tc_3', text: "Who thrives here — someone who came from government, nonprofit, private sector, or a hybrid?", attribute: 'team_culture', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_tc_4', text: "What's the pace of decision-making and what drives it?", attribute: 'team_culture', orgTypes: ['public_sector'] },
  { id: 'ps_ma_1', text: "What's the public good this organization delivers — in plain language, not grant language?", attribute: 'mission_alignment', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_ma_2', text: "Why would a talented executive choose public sector-adjacent work over a higher-paying private sector role?", attribute: 'mission_alignment', orgTypes: ['public_sector'] },
  { id: 'ps_ma_3', text: "What kind of person finds meaning in systems change rather than individual outcomes?", attribute: 'mission_alignment', orgTypes: ['public_sector'] },
  { id: 'ps_ma_4', text: "Has the organization ever had to compromise its mission for political or funding reasons — and how was that handled?", attribute: 'mission_alignment', orgTypes: ['public_sector'] },
  { id: 'ps_fp_1', text: "What happened to the last person in this role?", attribute: 'failure_pattern', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_fp_2', text: "Have you brought in someone from a corporate or pure nonprofit background who couldn't navigate the government-adjacent complexity — what happened?", attribute: 'failure_pattern', orgTypes: ['public_sector'] },
  { id: 'ps_fp_3', text: "What does someone get wrong about this environment in the first six months?", attribute: 'failure_pattern', orgTypes: ['public_sector'] },
  { id: 'ps_fp_4', text: "What assumption do outside candidates make about mission-driven work that kills them here?", attribute: 'failure_pattern', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_hd_1', text: "What behavior would sideline someone here that would be fine in a corporate or nonprofit environment?", attribute: 'hidden_disqualifier', orgTypes: ['public_sector'] },
  { id: 'ps_hd_2', text: "What does this role ask of someone's relationship with bureaucracy, ambiguity, and slow-moving systems?", attribute: 'hidden_disqualifier', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_hd_3', text: "Is there a type of ambition that doesn't work here?", attribute: 'hidden_disqualifier', orgTypes: ['public_sector'], isProbe: true },
  { id: 'ps_sp_1', text: "Two years from now this person has changed something about how this organization operates at a systems level. What is it?", attribute: 'success_picture', orgTypes: ['public_sector'] },
  { id: 'ps_sp_2', text: "What government relationships did they build that didn't exist before?", attribute: 'success_picture', orgTypes: ['public_sector'] },
  { id: 'ps_sp_3', text: "What does the organization's funding picture look like because they were in it?", attribute: 'success_picture', orgTypes: ['public_sector'] },
]

export const ALL_QUESTIONS: IntakeQuestion[] = [
  ...DECISION_MAKING_QUESTIONS,
  ...STARTUP_QUESTIONS,
  ...GROWTH_PE_QUESTIONS,
  ...ESTABLISHED_PRIVATE_QUESTIONS,
  ...PUBLIC_COMPANY_QUESTIONS,
  ...NONPROFIT_QUESTIONS,
  ...PUBLIC_SECTOR_QUESTIONS,
]

export function getQuestionsForOrgType(orgType: OrgType): IntakeQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.universal || q.orgTypes.includes(orgType))
}

export function getQuestionsByAttribute(attribute: QuestionAttribute): IntakeQuestion[] {
  return ALL_QUESTIONS.filter((q) => q.attribute === attribute)
}

export function getProbeQuestions(orgType: OrgType): IntakeQuestion[] {
  return getQuestionsForOrgType(orgType).filter((q) => q.isProbe)
}

export function getQuestionsForOrgTypeAndAttribute(orgType: OrgType, attribute: QuestionAttribute): IntakeQuestion[] {
  return ALL_QUESTIONS.filter((q) => (q.universal || q.orgTypes.includes(orgType)) && q.attribute === attribute)
}

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  startup: 'Startup / Early Stage',
  growth_pe: 'Growth / PE-Backed',
  established_private: 'Established Private / Family-Owned',
  public_company: 'Public Company',
  nonprofit: 'Nonprofit / Mission-Driven',
  public_sector: 'Public Sector / Government-Adjacent',
}

export const ATTRIBUTE_LABELS: Record<QuestionAttribute, string> = {
  business_context: 'Business Context',
  governance_leadership: 'Governance & Leadership',
  team_culture: 'Team & Culture',
  mission_alignment: 'Mission Alignment',
  failure_pattern: 'The Failure Pattern',
  hidden_disqualifier: 'The Hidden Disqualifier',
  success_picture: 'The Success Picture',
  decision_making: 'Decision-Making',
}