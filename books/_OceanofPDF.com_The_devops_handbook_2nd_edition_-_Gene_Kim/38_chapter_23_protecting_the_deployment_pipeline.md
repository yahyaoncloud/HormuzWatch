---
title: "Chapter 23: Protecting The Deployment Pipeline"
chapter: 38
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 489
word_count: 5100
estimated_tokens: 9878
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./37_chapter_22_information_security_is_everyones_job_every.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./39_part_vi_conclusion.md)

</div>

---

Throughout this chapter, we will look at how to protect our deployment pipeline, as well as how to achieve security and compliance objectives in our control environment, including change management and separation of duty.

Integrate Security and Compliance into Change Approval

Processes

Almost any IT organization of any signi cant size will have existing change management processes, which are the primary controls to reduce operations and security risks. Compliance managers and security managers place reliance on change management processes for compliance requirements, and they typically require evidence that all changes have been appropriately authorized. If we have constructed our deployment pipeline correctly so that deployments are low risk, the majority of our changes won’t need to go through a manual change approval process, because we will have placed our reliance on controls such as automated testing and proactive production monitoring. In this step, we will do what is required to ensure that we can successfully integrate security and compliance into any existing change management process. Effective change management policies will recognize that there are different risks associated with different types of changes and that those changes are all handled differently. These processes are de ned in ITIL, which breaks changes down into three categories:

Standard changes: These are lower-risk changes that follow an established and approved process but can also be pre-approved. They include monthly updates of application tax tables or country codes, website content and styling changes, and certain types of application or operating system patches that have wellunderstood impacts. The change proposer does not require approval before deploying the change, and change deployments can be completely automated and should be logged so there is traceability.

Normal changes: These are higher-risk changes that require review or approval from the agreed-upon change authority. In many organizations, this responsibility is inappropriately placed on the change advisory board (CAB) or emergency change advisory board (ECAB), which may lack the required expertise to understand the full impact of the change, often leading to unacceptably long lead times. This problem is especially relevant for large code deployments, which may contain hundreds of thousands (or even millions) of lines of new code, submitted by hundreds of developers over the course of several months. In order for normal changes to be authorized, the CAB will almost certainly have a well-de ned request for change (RFC) form that de nes what information is required for the go/no-go decision. The RFC form usually includes the desired business outcomes, planned utility and warranty,* a business case with risks and alternatives, and a proposed schedule.†

Urgent changes: These are emergency and, consequently, potentially high-risk changes that must be put into production immediately (e.g., urgent security patch, restore service). They often require senior management approval but allow documentation to be performed after the fact. A key goal of DevOps practices is to streamline our normal change process such that it is also suitable for emergency changes.

Recategorize Lower-Risk Changes as Standard Changes

Ideally, by having a reliable deployment pipeline in place, we will have already earned a reputation for fast, reliable, and undramatic deployments. At this point, we should seek to gain agreement from Operations and the relevant change authorities that our changes have been demonstrated to be low risk enough to be de ned as standard changes, pre-approved by the CAB. This enables us to deploy into production without need for further approval, although the changes should still be properly recorded. One way to support an assertion that our changes are low risk is to show a history of changes over a signi cant time period (e.g., months or quarters) and provide a complete list of production issues during that same period. If we can show high change success rates and low MTTR, we can assert that we have a control environment that is effectively preventing deployment errors, as well as prove that we can effectively and quickly detect and correct any resulting problems. Even when our changes are categorized as standard changes, they still need to be visual and recorded in our change management systems (e.g., Remedy or ServiceNow). Ideally, deployments will be performed automatically by our con guration management and deployment pipeline tools and the results will be automatically recorded. By doing this, everyone in our organization (DevOps or not) will have visibility into our changes in addition to all the other changes happening in the organization. We may automatically link these change request records to speci c items in our work planning tools (e.g., JIRA, Rally, LeanKit), allowing us to create more context for our changes, such as linking to feature defects, production incidents, or user stories. This can be accomplished in a lightweight way by including ticket ‡ numbers from planning tools in the comments associated with version control check-ins. By doing this, we can trace a production deployment to the changes in version control and, from there, trace them further back to the planning tool tickets. Creating this traceability and context should be easy and should not create an overly onerous or time-consuming burden for engineers. Linking to user stories, requirements, or defects is almost certainly sufficient—any further detail, such as opening a ticket for each commit to version control,

is likely not useful, and thus unnecessary and undesired, as it will impose a signi cant level of friction on their daily work.

What to Do When Changes Are Categorized as Normal Changes

For those changes that we cannot get classi ed as standard changes, they will be considered normal changes and will require approval from at least a subset of the CAB before deployment. In this case, our goal is still to ensure that we can deploy quickly, even if it is not fully automated. In this case, we must ensure that any submitted change requests are as complete and accurate as possible, giving the CAB everything they need to properly evaluate our change—after all, if our change request is malformed or incomplete, it will be bounced back to us, increasing the time required for us to get into production and casting doubt on whether we actually understand the goals of the change management process. We can almost certainly automate the creation of complete and accurate RFCs, populating the ticket with details of exactly what is to be changed. For instance, we could automatically create a ServiceNow change ticket with a link to the JIRA user story, along with the build manifests and test output from our deployment pipeline tool and links to the scripts that will be run and the dry run output of these commands. Because our submitted changes will be manually evaluated by people, it is even more important that we describe the context of the change. This includes identifying why we are making the change (e.g., providing a link to the features, defects, or incidents), who is affected by the change, and what is going to be changed. Our goal is to share the evidence and artifacts that give us con dence that the change will operate in production as designed. Although RFCs typically have free-form text elds, we should provide links to machinereadable data to enable others to integrate and process our data (e.g., links to JSON les). In many toolchains, this can be done in a compliant and fully automated way by associating a ticket number with every commit in version control. When we release a new change, we can automatically collate the commits included in that change and then assemble an RFC by

enumerating every ticket or bug that was completed or xed as part of these changes. Upon submission of our RFC, the relevant members of the CAB will review, process, and approve these changes as they would any other submitted change request. If all goes well, the change authorities will appreciate the thoroughness and detail of our submitted changes because we have allowed them to quickly validate the correctness of the information we’ve provided (e.g., viewing the links to artifacts from our deployment pipeline tools). However, our goal should be to continually show an exemplary track record of successful changes, so we can eventually gain their agreement that our automated changes can be safely classi ed as standard changes.

## Case Study

Automated          Infrastructure       Changes        as      Standard       Changes       at

Salesforce.com (2012)

Salesforce was founded in 2000 with the aim of making customer

relationship management easily available and deliverable as a service.

Salesforce’s       offerings    were     widely      adopted      by   the     marketplace,

leading to a successful IPO in 2004.                By 2007, the company had over

fifty-nine      thousand      enterprise      customers,      processing        hundreds      of

millions     of   transactions    per   day,    with   an   annual       revenue    of    $497

million.

However,       around    that   same      time,   their   ability   to   develop     and

release new functionality to their customers seemed to grind to a halt.

In   2006,   they    had   four   major   customer       releases,    but     in   2007   they

were only able to do one customer release despite having hired more

engineers.        The result was that the number of features delivered per

team   kept       decreasing   and    the   days     between      major       releases    kept

increasing. And because the batch size of each release kept ge                             ing

larger, the deployment outcomes also kept ge                    ing worse.

Karthik Rajan, then VP of Infrastructure Engineering, reports in a

2013 presentation that 2007 marked “the last year when software was

created and shipped using a waterfall process and when we made our

6 shift to a more incremental delivery process.”

At the 2014 DevOps Enterprise Summit, Dave Mangot and Reena

Mathew       described         the       resulting      multiyear         DevOps        transformation

that   started       in    2009.          According       to    Mangot         and           Mathew,           by

implementing DevOps principles and practices, the company reduced

their deployment lead times from six days to five minutes by 2013. As

a result, they were able to scale capacity more easily, allowing them to

process over one billion transactions per day.

One of the main themes of the Salesforce transformation was to

make quality engineering everyone’s job, regardless of whether they

were part of Development, Operations, or Infosec. To do this, they

integrated automated testing into all stages of the application and

environment creation, as well as into the continuous integration and

deployment        process,          and    created      the    open-source             tool   Rouster          to

conduct functional testing of their Puppet modules.

They also started to routinely perform                      destructive testing              , a term

used in manufacturing to refer to performing prolonged endurance

testing      under       the    most           severe    operating          conditions         until          the

component       being       tested        is   destroyed.      The    Salesforce         team        started

routinely testing their services under increasingly higher loads until

the service broke, which helped them understand their failure modes

and    make    appropriate               corrections.     Unsurprisingly,              the    result          was

significantly higher service quality with normal production loads.

Information Security also worked with Quality Engineering at the

earliest   stages     of    their        project,    continually          collaborating        in       critical

phases     such     as    architecture           and    test   design,       as       well    as   properly

integrating security tools into the automated testing process.

For Mangot and Mathew, one of the key successes from all the

repeatability and rigor they designed into the process was being told

by   their   change        management                group     that       “infrastructure          changes

made through Puppet would now be treated as ‘standard changes,’

requiring     far    less      or    even       no   further    approvals             from     the       CAB.”

However, they noted that “manual changes to infrastructure would

still require approvals.”

Salesforce not only integrated their DevOps processes with the change management process but also created further motivation to automate the change process for more of their infrastructure.

Implement Separation of Duty through Code Review

For decades, we have used separation of duty as one of our primary controls to reduce the risk of fraud or mistakes in the software development process. It has been the accepted practice in most SDLCs to require developer changes to be submitted to a code librarian, who would review and approve the change before IT Operations promoted the change into production. There are plenty of other less contentious examples of separation of duty in Ops work, such as server administrators ideally being able to view logs but not delete or modify them, in order to prevent someone with privileged access from deleting evidence of fraud or other issues. When we did production deployments less frequently (e.g., annually) and when our work was less complex, compartmentalizing our work and doing handoffs were tenable ways of conducting business. However, as complexity and deployment frequency increase, performing successful production deployments increasingly requires everyone in the value stream to quickly see the outcomes of their actions. The traditional approach to implementing separation of duty can often impede this by slowing down and reducing the feedback engineers receive on their work. This prevents engineers from taking full responsibility for the quality of their work and reduces a rm’s ability to create organizational learning. Consequently, wherever possible, we should implement separation of duties as a control. Instead, we should choose controls such as pair programming, continuous inspection of code check-ins, and code review. These controls can give us the necessary reassurance about the quality of our work. Furthermore, by putting these controls in place, if separation of

duties is required, we can show that we achieve equivalent outcomes with the controls we have created.

## Case Study

PCI Compliance and a Cautionary Tale of Separating Duties at Etsy

§ (2014)

Bill Massie is a development manager at Etsy and is responsible for

the payment application called ICHT (an abbreviation for “I Can Haz

Tokens”).       ICHT        takes     customer        credit    orders     through       a   set    of

internally      developed           payment     processing       applications      that      handle

online     order       entry     by   taking     customer-entered              cardholder         data,

tokenizing       it,    communicating            with    the     payment        processor,         and

completing the order transaction.

Because the scope of the Payment Card Industry Data Security

Standards       (PCI     DSS)       cardholder        data     environment       (CDE)       is   “the

people,    processes           and    technology       that     store,   process    or   transmit

cardholder       data       or   sensitive      authentication        data,”     including         any

connected system components, the ICHT application is in scope for

PCI DSS.

To contain the PCI DSS scope, the ICHT application is physically

and logically separated from the rest of the Etsy organization and is

managed by a completely separate application team of developers,

database engineers, networking engineers, and ops engineers. Each

team     member          is    issued    two     laptops:       one      for   ICHT   (which         is

configured differently to meet the DSS requirements, and is locked in

a safe when not in use) and one for the rest of Etsy.

By doing this, they were able to decouple the CDE environment

from the rest of the Etsy organization, limiting the scope of the PCI

DSS regulations to one segregated area. The systems that form the

CDE are separated (and managed differently) from the rest of Etsy’s

environments           at     the   physical,    network,        source    code,    and      logical

infrastructure levels. Furthermore, the CDE is built and operated by a

cross-functional team that is solely responsible for the CDE.

The ICHT team had to modify their continuous delivery practices

in order to accommodate the need for code approvals. According to

Section 6.3.2 of the PCI DSS v3.1, teams should review all custom code

prior to release to production or customers in order to identify any

potential      coding     vulnerability        (using      either     manual      or    automated

processes) as follows:

    - Are     code      changes    reviewed         by    individuals      other    than      the

originating code author, and by individuals knowledgeable

about code-review techniques and secure coding practices?

    - Do      code      reviews    ensure      code      is    developed     according         to

secure coding guidelines?

    - Are appropriate corrections implemented prior to release?

    - Are      code      review         results     reviewed         and    approved          by

management prior to release?

To fulfill this requirement, the team initially decided to designate

Massie as the change approver responsible for deploying any changes

into production. Desired deployments would be flagged in JIRA, and

Massie    would      mark    them        as   reviewed         and   approved     and       manually

deploy them into the ICHT production.

This has enabled Etsy to meet their PCI DSS requirements and get

their   signed    Report     of    Compliance            from    their   assessors.         However,

with regard to the team, significant problems have resulted.

Massie       observes       that     one      troubling      sideeffect        “is   a    level   of

‘compartmentalization’ that is happening in the ICHT team that no

other group is having at Etsy. Ever since we implemented separation

of duty and other controls required by the PCI DSS compliance, no

one can be a full-stack engineer in this environment.”

As    a   result,   while     the   rest   of   the   Development         and       Operations

teams at Etsy work together closely and deploy changes smoothly

and with confidence, Massie notes that:

within our PCI environment, there is fear and reluctance

around deployment and maintenance because no one has

visibility outside their portion of the software stack. The

seemingly minor changes we made to the way we work

seem     to     have     created       an       impenetrable         wall      between

developers and ops, and creates an undeniable tension that

no   one    at   Etsy     has       had    since      2008.    Even      if   you    have

confidence         in     your        portion,         it’s   impossible         to       get

confidence that someone else’s change isn’t going to break

your part of the stack.

This case study shows that compliance is possible in organizations using DevOps. However, the potentially cautionary tale here is that all the virtues that we associate with high-performing DevOps teams are fragile—even a team that has shared experiences with high trust and shared goals can begin to struggle when low-trust control mechanisms are put into place.

## Case Study: New To The Second

EDITION

Biz and Tech Partnership toward Ten “No Fear Releases” Per Day at

Capital One (2020)

Over    the    last    seven     years,     Capital       One       has   been       undergoing        an

Agile/DevOps          transformation.            In    that     time,     they’ve      moved          from

waterfall to Agile, from outsource to insource and open-sources, from

monolithic to microservices, from data centers to the cloud.

But      they      were    still   facing      a    big   problem:      an    aging          customer

servicing platform. This platform serviced tens of millions of Capital

One    credit   card    customers           and       generated      hundreds         of   millions     of

dollars in value to the business.                     It was a critical platform, but it was

showing its age and was no longer meeting customer needs or the

internal    strategic    needs        of   the    company.          They   needed          to   not   only

solve the technology/cyber-risk problem of the aging platform but

also increase the NPV (net present value) of the system.

“What we had was a mainframe-based vendor product that had

been bandaged to the point where the systems and operational teams

were as large as the product itself. . . . We needed a modern system to

deliver     on    the    business           problem,”         says       Rakesh     Goyal,     Director,

Technology Engineering at Capital One.

They    started       with      a   set    of   principles      to   work     from.   First,   they

worked      backwards            from      the   customer’s          needs.      Second,    they     were

determined        to    deliver       value      iteratively        to    maximize     learnings      and

minimize risk. And third, they wanted to avoid anchoring bias. That is,

they wanted to make sure they were not just building a faster and

stronger horse but actually solving a problem.

With    these     guiding           principles     in   place,      they   set   about    making

changes.      First,    they      took      a    look   at    their      platform    and    the   set   of

customers.       Then       they      divided         them    into    segments       based    on     what

their needs were and what functionalities they needed. Importantly,

they thought strategically about who their customers were, because

it   wasn’t   just   credit       card     holders.     Their       customers       were    regulators,

business analysts, internal employees who used the system, etc.

“We use very heavy human-centered design to ensure that we are

actually meeting the needs [of our customers] and not just replicating

what    was      there      in   the      old    system,”      says       Biswanath     Bosu,     Senior

Business      Director,          Anti-Money           Laundering-Machine               Learning      and

Fraud at Captial One.

Next they graded these segments on the sequence in which they

would be deployed. Each segment represented a thin slice that they

could experiment with, see what worked and what didn’t, and then

iterate from there.

“As   much       as    we       were      looking       for   an     MVP    [minimum         viable

product], we were not looking for the least common denominator. We

were looking for the minimum viable experience that we could give to

our customers, not just any small product we could come up with.

Once we test that piece out and it works, the next thing we will do is

just essentially scale it up,” explained Bosu.

As part of the platform transformation, it was clear they would

need to move to the cloud. They would also need to invest in and

evolve the tools in their toolbox, as well as invest in reskilling for their

engineers to provide them with the appropriate tooling to be agile

during this transformation.

They      se   led     on    building        an    API-driven          microservice-based

architecture       system.       The     goal        was      to     sustain      and    build        it

incrementally, slowly expanding into various business strategies.

“You   can     think   of    this   as    having     a    fleet   of   smart   cars    built   for

specific workloads rather than one futuristic car,” describes Goyal.

They        began      by     leveraging           proven        enterprise         tools.    By

standardizing, they could react faster to situations where engineers

needed     to   contribute       to    other    teams        or   move     from   one     team        to

another.

Building       out   their   CI/CD       pipeline    enabled          incremental     releases

and empowered teams by reducing cycle time and risk. As a financial

institution,     they    also    had     to    address        regulatory      and    compliance

controls. Using the pipeline, they were able to block releases when

certain controls were not met.

The    pipeline      also    allowed       teams     to   focus    on     product    features,

since   the     pipeline   was     a    tool    to    leverage       rather   than   a    required

investment from each team. At the height of their effort, they had

twenty-five teams working and contributing simultaneously.

Focusing on customer needs and building a CI/CD pipeline helped Captial One not only meet business needs but move faster.

Ensure Documentation and Proof for Auditors and Compliance

Officers

As technology organizations increasingly adopt DevOps patterns, there is more tension than ever between IT and Audit. These new DevOps patterns challenge traditional thinking about auditing, controls, and risk mitigation.

As Bill Shinn, a principal security solutions architect at Amazon Web Services, observes,

DevOps is all about bridging the gap between Dev and Ops. In some ways, the challenge of bridging the gap between DevOps and auditors and compliance officers is even larger. For instance, how many auditors can read code and how many developers have read NIST 800-37 or the Gramm-Leach-Bliley Act? That creates a gap of knowledge, and the DevOps community needs to help bridge that gap.24

## Case Study

Proving Compliance in Regulated Environments (2015)

Helping large enterprise customers show that they can still comply

with    all   relevant          laws     and      regulations       is    among       Bill    Shinn’s

responsibilities as a principal security solutions architect at Amazon

Web    Services.          Over    the    years,    he   has   spent       time   with    over    one

thousand enterprise customers, including Hearst Media, GE, Phillips,

and    Pacific   Life,      who     have    publicly      referenced       their   use    of    public

clouds in highly regulated environments.

Shinn   notes,       “One     of   the   problems       is   that   auditors     have     been

trained in methods that aren’t very suitable for DevOps work pa                                 erns.

For   example,       if   an    auditor   saw     an    environment        with   ten    thousand

productions servers, they have been traditionally trained to ask for a

sample of one thousand servers, along with screenshot evidence of

asset management, access control se                      ings, agent installations, server

logs, and so forth.”

“That   was         fine    with    physical      environments,”        Shinn      continues.

“But   when     infrastructure            is   code,    and    when       auto-scaling        makes

servers appear and disappear all the time, how do you sample that?

You    run    into    the       same     problems       when       you    have    a   deployment

pipeline,     which        is    very     different      than       the    traditional        software

development process, where one group writes the code and another

group deploys that code into production.”

He explains, “In audit fieldwork, the most commonplace methods

of gathering evidence are still screenshots and CSV files filled with

configuration        se    ings    and       logs.   Our   goal      is    to   create    alternative

methods of presenting the data that clearly show auditors that our

controls are operating and effective.”

To help bridge that gap, he has teams work with auditors in the

control design process. They use an iterative approach, assigning a

single control for each sprint to determine what is needed in terms of

audit    evidence.       This     has       helped     ensure        that      auditors      get    the

information they need when the service is in production, entirely on

demand.

Shinn states that the best way to accomplish this is to “send all

data into our telemetry systems, such as Splunk or Kibana. This way

auditors can get what they need, completely self-serviced. They don’t

need to request a data sample—instead, they log into Kibana, and

then    search     for   audit    evidence        they    need      for   a    given    time    range.

Ideally, they’ll see very quickly that there’s evidence to support that

our controls are working.”

Shinn continues, “With modern audit logging, chat rooms, and

deployment          pipelines,          there’s      unprecedented                visibility        and

transparency        into     what’s          happening         in    production,          especially

compared      to    how     Operations            used    to    be    done,      with     far   lower

probability    of   errors      and     security     flaws      being       introduced.       So,    the

challenge     is   to    turn    all   that   evidence       into    something          an     auditor

recognizes.”

That     requires      deriving          the   engineering        requirements         from      the

actual regulations. Shinn explains,

To   discover      what         HIPAA      requires     from       an    information

security perspective, you have to look into the forty-five

CFR Part 160 legislation, go into Subparts A and C of Part

       164. Even then, you need to keep reading until you get into

‘technical safeguards and audit controls.’ Only there will

you see that what is required is that we need to determine

activities    that    will      be    tracked      and   audited         relevant       to

Patient Healthcare Information, document and implement

those        controls,       select     tools,     and    then      finally     review    and

capture the appropriate information.

Shinn continues, “How to fulfill that requirement is the discussion

that   needs         to   be   happening            between          compliance         and    regulatory

officers, and the security and DevOps teams, specifically around how

to   prevent,        detect,    and        correct    problems.           Sometimes       they      can    be

fulfilled in a configuration se                      ing in version control. Other times, it’s a

monitoring control.”

Shinn gives an example: “We may choose to implement one of

those     controls        using      AWS      CloudWatch,             and   we   can     test   that      the

control is operating with one command line. Furthermore, we need to

show where the logs are going—in the ideal, we push all this into our

logging framework, where we can link the audit evidence with the

actual control requirement.”

To    help       solve    this       problem,        the   DevOps Audit Defense Toolkit describes           the   end-to-end          narrative         of   the    compliance         and   audit

process for a fictitious organization (Parts Unlimited from                                    The Phoenix Project   ).   It    starts    by    describing         the     entity’s      organizational         goals,

business processes, top risks, and resulting control environment, as

well as how management could successfully prove that controls exist

and are effective. A set of audit objections is also presented, as well as

how to overcome them.

The       toolkit     describes          how      controls        could     be     designed      in    a

deployment            pipeline       to     mitigate       the       stated    risks,    and    provides

examples of control a                estations and control artifacts to demonstrate

control        effectiveness.         It    was     intended      to    be   general      to   all   control

objectives,          including       in     support        of    accurate      financial        reporting,

regulatory          compliance            (e.g.,    SEC    SOX-404,         HIPAA,      FedRAMP,          EU

Model          Contracts,      and         the     proposed          SEC    Reg-SCI       regulations),

contractual obligations (e.g., PCI DSS, DOD DISA), and effective and

efficient operations.

This case study shows how building documentation helps bridge the gap between Dev and Ops practices and auditor requirements, showing DevOps can comply with requirements and improve risk assessment and mitigation.

## Case Study

Relying on Production Telemetry for ATM Systems (2013)

Mary Smith (a pseudonym) heads up the DevOps initiative for the

consumer       banking       property        of      a    large       US        financial     services

organization.       She   made     the    observation              that   Information       Security,

auditors, and regulators often put too much reliance on code reviews

to   detect   fraud.      Instead,      they    should          be    relying      on     production

monitoring     controls      in   addition      to   using          automated        testing,      code

reviews,   and      approvals      to   effectively        mitigate         the    risks   associated

with errors and fraud.

She observed:

Many     years      ago,     we    had    a    developer            who      planted    a

backdoor       in   the   code     that   we       deploy       to    our    ATM     cash

machines.        They       were      able         to    put        the    ATMs       into

maintenance mode at certain times, allowing them to take

cash out of the machines. We were able to detect the fraud

very quickly, and it wasn’t through a code review. These

types    of   backdoors       are   difficult,            or   even     impossible,      to

detect     when      the     perpetrators               have    sufficient          means,

motive, and opportunity.

However,       we      quickly   detected            the   fraud       during    our

regular operations review meeting when someone noticed

that ATMs in a city were being put into maintenance mode

at unscheduled times. We found the fraud even before the

scheduled       cash      audit   process,         when        they       reconcile   the

amount         of        cash    in    the   ATMs       with      authorized

transactions.

In this case study, the fraud occurred despite separation of duties

between       Development             and   Operations     and    a   change      approval

process, but it was quickly detected and corrected through effective

production telemetry.

As this case study demonstrates, auditors’ overreliance on code reviews and separation of duties between Dev and Ops can leave vulnerabilities. Telemetry helps provide the necessary visibility to detect and act upon errors and fraud, mitigating the perceived need to separate duties or create additional layers of change review boards.

Conclusion

Throughout this chapter, we have discussed practices that make information security everyone’s job, where all of our information security objectives are integrated into the daily work of everyone in the value stream. By doing this, we signi cantly improve the effectiveness of our controls so that we can better prevent security breaches, as well as detect and recover from them faster. And we signi cantly reduce the work associated with preparing and passing compliance audits.

* ITIL defines utility as “what the service does,” while warranty is defined as “how the service is

delivered and can be used to determine whether a service is ‘fit for use.’”1 † To further manage risk changes, we may also have defined rules, such as certain changes can only be implemented by a certain group or individual (e.g., only DBAs can deploy database schema changes). Traditionally, the CAB meetings have been held weekly, where the change requests are approved and scheduled. From ITIL Version 3 onward, it is acceptable for changes to be approved electronically in a just-in-time fashion through a change management tool. It also specifically recommends that “standard changes should be identified early on when building the Change Management process to promote efficiency. Otherwise, a Change Management implementation can create unnecessarily high levels of administration and resistance to the Change Management process.”2

‡ The term ticket is used generically to indicate any uniquely identifiable work item. § The authors thank Bill Massie and John Allspaw for spending an entire day with Gene Kim, sharing their compliance experience.


---

<div align="center">

[« Previous Chapter](./37_chapter_22_information_security_is_everyones_job_every.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./39_part_vi_conclusion.md)

</div>
