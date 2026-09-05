---
title: "Appendices"
chapter: 41
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 520
word_count: 3615
estimated_tokens: 6042
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./40_afterword_to_the_second_edition.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./42_bibliography.md)

</div>

---

Appendix 1: The Convergence of DevOps

We believe that DevOps is bene ting from an incredible convergence of management movements, which are all mutually reinforcing and can help create a powerful coalition to transform how organizations develop and deliver IT products and services. John Willis named this “the convergence of DevOps.” The various elements of this convergence are described below in approximate chronological order. (Note that these descriptions are not intended to be exhaustive, but merely enough to show the progression of thinking and the rather improbable connections that led to DevOps.)

The Lean Movement

The Lean Movement started in the 1980s as an attempt to codify the Toyota Production System with the popularization of techniques such as value stream mapping, kanban boards, and total productive maintenance.1 Two major tenets of Lean were the deeply held belief that lead time (i.e., the time required to convert raw materials into nished goods) was the best predictor of quality, customer satisfaction, and employee happiness; and that one of the best predictors of short lead times was small batch sizes, with the theoretical ideal being “single piece ow” (i.e., “1x1” ow: inventory of 1, batch size of 1). Lean principles focus on creating value for the customer—thinking systematically, creating constancy of purpose, embracing scienti c

thinking, creating ow and pull (versus push), assuring quality at the source, leading with humility, and respecting every individual.

The Agile Movement

Started in 2001, the Agile Manifesto was created by seventeen of the leading thinkers in software development, with the goal of turning lightweight methods such as DP and DSDM into a wider movement that could take on heavyweight software development processes such as waterfall development and methodologies such as the rational uni ed process. A key principle was to “deliver working software frequently, from a couple of weeks to a couple of months, with a preference to the shorter timescale.”2 Two other principles focus on the need for small, selfmotivated teams, working in a high-trust management model and an emphasis on small batch sizes. Agile is also associated with a set of tools and practices such as Scrum, Standups, and so on.

The Velocity Conference Movement

Started in 2007, the Velocity Conference was created by Steve Souders, John Allspaw, and Jesse Robbins to provide a home for the IT Operations and Web Performance tribe. At the Velocity 2009 conference, John Allspaw and Paul Hammond gave the seminal “10 Deploys per Day: Dev and Ops Cooperation at Flickr,” presentation.

The Agile Infrastructure Movement

At the 2008 Agile Toronto conference, Patrick Debois and Andrew Shafer held a “birds of a feather” session on applying Agile principles to infrastructure as opposed to application code. They rapidly gained a following of like-minded thinkers, including John Willis. Later, Debois was so excited by Allspaw and Hammond’s “10 Deploys per Day: Dev and Ops Cooperation at Flickr” presentation that he created the rst DevOpsDays in Ghent, Belgium, in 2009, coining the word “DevOps.”

The Continuous Delivery Movement

Building upon the Development discipline of continuous build, test, and integration, Jez Humble and David Farley extended the concept of continuous delivery, which included a “deployment pipeline” to ensure that code and infrastructure are always in a deployable state and that all code checked into truck is deployed into production.3 This idea was rst presented at Agile 2006 and was also independently developed by Tim Fitz in a blog post titled “Continuous Deployment.”4

The Toyota Kata Movement

In 2009, Mike Rother wrote Toyota Kata: Managing People for Improvement, Adaptiveness and Superior Results, which described learnings over his twenty-year journey to understand and codify the causal mechanisms of the Toyota Production System. Toyota Kata describes the “unseen managerial routines and thinking that lie behind Toyota’s success with continuous improvement and adaptation . . . and how other companies develop similar routines and thinking in their organizations.”5 His conclusion was that the Lean community missed the most important practice of all, which he described as the Improvement Kata. He explains that every organization has work routines, and the critical factor in Toyota was making improvement work habitual and building it into the daily work of everyone in the organization. The Toyota Kata institutes an iterative, incremental, scienti c approach to problem-solving in the pursuit of a shared organizational true north.6

The Lean Startup Movement

In 2011, Eric Ries wrote The Lean Startup: How Today’s Entrepreneurs Use Continuous Innovation to Create Radically Successful Businesses, codifying the lessons he learned at IMVU, a Silicon Valley startup, which built upon the work of Steve Blank in The Four Steps to the Epiphany as well as continuous deployment techniques. Eric Ries also codi ed related practices and terms

including minimum viable product, the build-measure-learn cycle, and many continuous deployment technical patterns.7

The Lean UX Movement

In 2013, Jeff Gothelf wrote Lean UX: Applying Lean Principles to Improve User Experience, which codi ed how to improve the “fuzzy front end” and explained how product owners can frame business hypotheses, experiment, and gain con dence in those business hypotheses before investing time and resources in the resulting features. By adding Lean UX, we now have the tools to fully optimize the ow between business hypotheses, feature development, testing, deployment, and service delivery to the customer.

The Rugged Computing Movement

In 2011, Joshua Corman, David Rice, and Jeff Williams examined the apparent futility of securing applications and environments late in the life cycle. In response, they created a philosophy called “Rugged Computing,” which attempts to frame the non-functional requirements of stability, scalability,   availability,   survivability,     sustainability, security, supportability, manageability, and defensibility. Because of the potential for high release rates, DevOps can put incredible pressure on QA and Infosec, because when deploy rates go from monthly or quarterly to hundreds or thousands daily, no longer are twoweek turnaround times from Infosec or QA tenable. The Rugged Computing movement posited that the current approach to ghting the vulnerable industrial complex being employed by most information security programs is hopeless.

Appendix 2: Theory of Constraints and Core, Chronic Conflicts

The Theory of Constraints body of knowledge extensively discusses the use of creating core con ict clouds (often referred to as “C3”). Figure A.1 shows the con ict cloud for IT:

Figure A.1: The Core, Chronic Con ict Facing Every IT Organization During the 1980s, there was a very well-known core, chronic con ict in manufacturing. Every plant manager had two valid business goals: protect sales and reduce costs. The problem was that in order to protect sales, sales management was incentivized to increase inventory to ensure that it was always possible to ful ll customer demand. On the other hand, in order to reduce cost, production management was incentivized to decrease inventory to ensure that money was not tied up in work-in-progress that wasn’t immediately shippable to the customer in the form of ful lled sales. They were able to break the con ict by adopting Lean principles, such as reducing batch sizes, reducing work in process, and shortening and amplifying feedback loops. This resulted in dramatic increases in plant productivity, product quality, and customer satisfaction. The principles behind DevOps work patterns are the same as those that transformed manufacturing, allowing us to optimize the IT value stream, converting business needs into capabilities and services that provide value for our customers.

Appendix 3: Tabular Form of Downward Spiral

The tabular form of the downward spiral depicted in The Phoenix Project is shown in Table A.1.

Table A.1: The Downward Spiral

IT Operations sees . . .                        Development sees . . .

Fragile applications are prone to Fragile applications are prone to failure failure

Long time required to gure out More urgent, date-driven projects put into the queue which bit got ipped

Detective control is a Even more fragile code (less secure) put into production salesperson

Too much time required to More releases have increasingly turbulent installs restore service

Too much re ghting and Release cycles lengthen to amortize cost of deployments unplanned work

Urgent security rework and Failing bigger deployments more difficult to diagnose remediation

Planned project work cannot be      Most senior and constrained IT ops resources have less completed                        time to x underlying process problems

Ever increasing backlog of work that could help the Frustrated customers leave business win

Ever increasing amount of tension between IT Ops, Market share goes down Development, Design

Business misses Wall Street — commitments

Business makes even larger — promises to Wall Street

Appendix 4: The Dangers of Handoffs and Queues

The problem with high amounts of queue time is exacerbated when there are many handoffs, because that is where queues are created. Figure A.2 shows wait time as a function of how busy a resource at a work center is. The asymptotic curve shows why a “simple thirty-minute change” often takes weeks to complete—speci c engineers and work centers often become problematic bottlenecks when they operate at high utilization. As a work center approaches 100% utilization, any work required from it will languish in queues and won’t be worked on without someone expediting/escalating.

Figure A.2: Queue Size and Wait Times as a Function of Percent Utilization Source: Kim, Behr, and Spafford, The Phoenix Project, ePub edition, 557.

In Figure A.2, the x-axis is the percent busy for a given resource at a work center and the y-axis is the approximate wait time (or, more precisely stated, the queue length). What the shape of the line shows is that as resource utilization goes past 80%, wait time goes through the roof. In The Phoenix Project, Bill and his team realized the devastating consequences of this property on lead times for the commitments they

were making to the project management office:8

I tell them about what Erik told me at MRP-8, about how wait times depend upon resource utilization. “The wait time is the ‘percentage of time busy’ divided by the ‘percentage of time idle.’ In other words, if a resource is fifty percent busy, then it’s fifty percent idle. The wait time is fifty percent divided by fifty percent, so one unit of time. Let’s call it one hour. So, on average, our task would wait in the queue for one hour before it gets worked. “On the other hand, if a resource is ninety percent busy, the wait time is ‘ninety percent divided by ten percent or nine hours’. In other words, our task would wait in queue nine times longer than if the resource were fifty percent idle.” I conclude, “So . . . For the Phoenix task, assuming we have seven handoffs, and that each of those resources is busy ninety percent of the time, the tasks would spend in queue a total of nine hours times the seven steps . . .” “What? Sixty-three hours, just in queue time?” Wes says, incredulously. “That’s impossible!” Patty says with a smirk, “Oh, of course. Because it’s only thirty seconds of typing, right?”

Bill and team realize that their “simple thirty-minute task” actually requires seven handoffs (e.g., server team, networking team, database team, virtualization team, and, of course, Brent, the “rockstar” engineer). Assuming that all work centers were 90% busy, Figure A.2 shows us that the average wait time at each work center is nine hours—and because the work had to go through seven work centers, the total wait time is seven times that: sixty-three hours. In other words, the total % of value added time (sometimes known as process time) was only 0.16% of the total lead time (thirty minutes divided by sixty-three hours). That means that for 99.8% of our total lead time, the work was simply sitting in queue, waiting to be worked on.

Appendix 5: Myths of Industrial Safety

Decades of research into complex systems shows that countermeasures are based on several myths. In “Some Myths about Industrial Safety,” by Denis Besnard and Erik Hollnagel, they are summarized as such:

Myth 1: “Human error is the largest single cause of accidents and incidents.”9 Myth 2: “Systems will be safe if people comply with the procedures they have been given.”10 Myth 3: “Safety can be improved by barriers and protection; more layers of protection results in higher safety.”11 Myth 4: “Accident analysis can identify the root cause (the ‘truth’) of why the accident happened.”12 Myth 5: “Accident investigation is the logical and rational identi cation of causes based on facts.”13 Myth 6: “Safety always has the highest priority and will never be compromised.”14

The differences between what is myth and what is true are shown in Table A.2.

Table A.2: Two Stories

Myth                                            Reality

Human error is seen as the cause of          Human error is seen as the effect of systemic failure.                        vulnerabilities deeper inside the organization.

Saying what people should have done        Saying what people should have done doesn’t explain is a satisfying way to describe failure.     why it made sense for them to do what they did.

Telling people to be more careful will    Only by constantly seeking out their vulnerabilities make the problem go away.                    can organizations enhance safety.

Appendix 6: The Toyota Andon Cord

Many ask, how can any work be completed if the Andon cord is being pulled over ve thousand times per day? To be precise, not every Andon

cord pull results in stopping the entire assembly line. Rather, when the Andon cord is pulled, the team leader overseeing the speci ed work center has fty seconds to resolve the problem. If the problem has not been resolved by the time the fty seconds is up, the partially assembled vehicle will cross a physically drawn line on the oor, and the assembly line will be stopped.15

Figure A.3: The Toyota Andon Cord

Appendix 7: COTS Software

Currently, in order to get complex COTS (commercial off-the-shelf) software (e.g., SAP, IBM WebSphere, Oracle WebLogic) into version control, we may have to eliminate the use of graphical point-and-click vendor installer tools. To do that, we need to discover what the vendor installer is doing, and we may need to do an install on a clean server

image, diff the le system, and put those added les into version control. Files that don’t vary by environment are put into one place (“base install”), while environment-speci c les are put into their own directory (“test” or “production”). By doing this, software install operations become merely a version control operation, enabling better visibility, repeatability, and speed. We may also have to transform any application con guration settings so that they are in version control. For instance, we may transform application con gurations that are stored in a database into XML les and vice versa.

Appendix 8: Post-Mortem Meetings (Retrospective)

A sample agenda of the post-mortem meeting is shown below:16

  - An initial statement will be made by the meeting leader or

facilitator to reinforce that this meeting is a blameless postmortem and that we will not focus on past events or speculate on “would haves” or “could haves.” Facilitators might read the “Retrospective     Prime       Directive”     from     the      website Retrospective.com.

  - Furthermore, the facilitator will remind everyone that any

countermeasures must be assigned to someone, and if the corrective action does not warrant being a top priority when the meeting is over, then it is not a corrective action. (This is to prevent the meeting from generating a list of good ideas that are never implemented.)

  - Those at the meeting will reach an agreement on the complete

timeline of the incident, including when and who detected the issue, how it was discovered (e.g., automated monitoring, manual detection, customer noti ed us), when service was satisfactorily restored, and so forth. We will also integrate into the timeline all external communications during the incident.

  - When we use the word “timeline,” it may evoke the image of a

linear set of steps of how we gained an understanding of the problem and eventually xed it. In reality, especially in complex

systems, there will likely be many events that contributed to the accident, and many troubleshooting paths and actions will have been taken in an effort to x it. In this activity, we seek to chronicle all of these events and the perspectives of the actors and establish hypotheses concerning cause and effect where possible.

- The team will create a list of all the factors that contributed to the

incident, both human and technical. They may then sort them into categories, such as “design decision,” “remediation,” “discovering there was a problem,” and so forth. The team will use techniques such as brainstorming and the “in nite hows” to drill down on contributing factors they deem particularly important to discover deeper levels of contributing factors. All perspectives should be included and respected—nobody should be permitted to argue with or deny the reality of a contributing factor somebody else has identi ed. It’s important for the post-mortem facilitator to ensure that sufficient time is spent on this activity and that the team doesn’t try and engage in convergent behavior such as trying to identify one or more “root causes.”

- Those at the meeting will reach an agreement on the list of

corrective actions that will be made top priorities after the meeting. Assembling this list will require brainstorming and choosing the best potential actions to either prevent the issue from occurring or enable faster detection or recovery. Other ways to improve the systems may also be included.

- Our goal is to identify the smallest number of incremental steps to

achieve the desired outcomes, as opposed to “Big Bang” changes, which not only take longer to implement, but delay the improvements we need.

- We will also generate a separate list of lower-priority ideas and

assign an owner. If similar problems occur in the future, these ideas may serve as the foundation for crafting future countermeasures.

- Those at the meeting will reach an agreement on the incident

metrics and their organizational impact. For example, we may choose to measure our incidents by the following metrics:

∘ Event severity: How severe was this issue? This directly relates to the impact on the service and our customers. ∘ Total downtime: How long were customers unable to use the service to any degree? ∘ Time to detect: How long did it take for us or our systems to know there was a problem? ∘ Time to resolve: How long after we knew there was a problem did it take for us to restore service?

Bethany Macri from Etsy observed, “Blamelessness in a post-mortem does not mean that no one takes responsibility. It means that we want to nd out what the circumstances were that allowed the person making the change or who introduced the problem to do this. What was the larger environment? . . . The idea is that by removing blame, you remove fear, and by removing fear, you get honesty.”17

Appendix 9: The Simian Army

After the 2011 AWS US-East outage, Net ix had numerous discussions about engineering their systems to automatically deal with failure. These discussions have evolved into a service called “Chaos Monkey.”18 Since then, Chaos Monkey has evolved into a whole family of tools, known internally as the “Net ix Simian Army,” to simulate increasingly catastrophic levels of failures:19

  - Chaos Gorilla: simulates the failure of an entire AWS availability

zone.

  - Chaos Kong: simulates failure of entire AWS regions, such as

North America or Europe.

Other member of the Simian Army now include:

  - Latency Monkey: induces arti cial delays or downtime in their

RESTful client-server communication layer to simulate service degradation and ensure that dependent services respond appropriately.

  - Conformity Monkey: nds and shuts down AWS instances that

don’t adhere to best-practices (e.g., when instances don’t belong to an auto-scaling group or when there is no escalation engineer email address listed in the service catalog).

  - Doctor Monkey: taps into health checks that run on each instance

and nds unhealthy instances and proactively shuts them down if owners don’t x the root cause in time.

  - Janitor Monkey: ensures that their cloud environment is running

free of clutter and waste; searches for unused resources and disposes of them.

  - Security Monkey: an extension of Conformity Monkey; nds and

terminates instances with security violations or vulnerabilities, such as improperly con gured AWS security groups.

Appendix 10: Transparent Uptime

Lenny Rachitsky wrote about the bene ts of what he called “transparent uptime:”20

Your support costs go down as your users are able to self-identify system wide problems without calling or emailing your support department. Users will no longer have to guess whether their issues are local or global and can more quickly get to the root of the problem before complaining to you. You are better able to communicate with your users during downtime events, taking advantage of the broadcast nature of the internet versus the one-to-one nature of email and the phone. You spend less time communicating the same thing over and over and more time resolving the issue. You create a single and obvious place for your users to come to when they are experiencing downtime. You save your users’ time currently spent searching forums, Twitter, or your blog. Trust is the cornerstone of any successful SaaS adoption. Your customers are betting their business and their livelihoods on your service or platform. Both current and prospective customers require confidence in your service. Both need to know they won’t be left in

the dark, alone and uninformed, when you run into trouble. Real time insight into unexpected events is the best way to build this trust. Keeping them in the dark and alone is no longer an option. It’s only a matter of time before every serious SaaS provider will be offering a public health dashboard. Your users will demand it.


---

<div align="center">

[« Previous Chapter](./40_afterword_to_the_second_edition.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./42_bibliography.md)

</div>
