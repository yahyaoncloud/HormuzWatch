---
title: "Chapter 7: How To Design Our Organization And Architecture With Conway’s Law In Mind"
chapter: 15
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 160
word_count: 6319
estimated_tokens: 11133
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./14_chapter_6_understanding_the_work_in_our_value.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./16_chapter_8_how_to_get_great_outcomes_by.md)

</div>

---

In the previous chapters, we identi ed a value stream to start our DevOps transformation and established shared goals and practices to enable a dedicated transformation team to improve how we deliver value to the customer. In this chapter, we will start thinking about how to organize ourselves to best achieve our value stream goals. After all, how we organize our teams affects how we perform our work. Dr. Melvin Conway performed a famous experiment in 1968 with a contract research organization that had eight people who were commissioned to produce a COBOL and an ALGOL compiler. He observed, “After some initial estimates of difficulty and time, ve people were assigned to the COBOL job and three to the ALGOL job. The resulting COBOL compiler ran in ve phases, the ALGOL compiler ran in three.”1 These observations led to what is now known as Conway’s Law, which states that “organizations which design systems . . . are constrained to produce designs which are copies of the communication structures of these organizations. . . . The larger an organization is, the less exibility it has and the more pronounced the phenomenon.”2 Eric S. Raymond, author of the book The Cathedral and the Bazaar: Musings on Linux and Open Source by an Accidental Revolutionary, crafted a simpli ed (and now, more famous) version of Conway’s Law in his Jargon File: “The organization of the software and the organization of the software team will be congruent; commonly stated as ‘if you have four groups working on a compiler, you’ll get a 4-pass compiler.’”3

In other words, how we organize our teams has a powerful effect on the software we produce, as well as our resulting architectural and production outcomes. In order to get fast ow of work from Development into Operations, with high quality and great customer outcomes, we must organize our teams and our work so that Conway’s Law works to our advantage. Done poorly, Conway’s Law will prevent teams from working safely and independently; instead, they will be tightly coupled, all waiting on each other for work to be done, with even small changes creating potentially global, catastrophic consequences.

Conway’s Law at Etsy

An example of how Conway’s Law can either impede or reinforce our goals can be seen in a technology that was developed at Etsy called Sprouter. Etsy’s DevOps journey began in 2009, and its technical teams were early developers and proponents of the ideas in this book. Etsy’s 2014 revenue was nearly $200 million, and the company had a successful IPO in 2015.4 Originally developed in 2007, Sprouter connected people, processes, and technology in ways that created many undesired outcomes. Sprouter, shorthand for “stored procedure router,” was originally designed to help make life easier for the developers and database teams. As Ross Snyder, a senior engineer at Etsy, said during his presentation at Surge 2011, “Sprouter was designed to allow the Dev teams to write PHP code in the application, the DBAs to write SQL inside Postgres, with Sprouter helping them meet in the middle.”5 Sprouter resided between their front-end PHP application and the Postgres database, centralizing access to the database and hiding the database implementation from the application layer. The problem was that adding any changes to business logic resulted in signi cant friction between developers and the database teams. As Snyder observed, “For nearly any new site functionality, Sprouter required that the DBAs write a new stored procedure. As a result, every time developers wanted to add new functionality, they would need something from the DBAs, which often required them to wade through a ton of bureaucracy.”6

In other words, developers creating new functionality had a dependency on the DBA team, which needed to be prioritized, communicated, and coordinated, resulting in work sitting in queues, meetings, longer lead times, and so forth.7 This is because Sprouter created a tight coupling between the development and database teams, preventing developers from being able to independently develop, test, and deploy their code into production. The stored procedures for the database were also tightly coupled to Sprouter. Any time a stored procedure was changed, it required changes to Sprouter too. The result was that Sprouter became an ever-larger single point of failure. Snyder explained that everything was so tightly coupled and required such a high level of synchronization as a result that almost every deployment caused a mini-outage.8 Both the problems associated with Sprouter and their eventual solution can be explained by Conway’s Law. Etsy initially had two teams, the developers and the DBAs, who were each responsible for two layers of the service: the application logic layer and the stored procedure layer.9 Two teams working on two layers, as Conway’s Law predicts. Sprouter was intended to make life easier for both teams, but it didn’t work as expected—when business rules changed, instead of changing only two layers, they now needed to make changes to three layers (in the application, in the stored procedures, and now in Sprouter). The resulting challenges of coordinating and prioritizing work across three teams signi cantly increased lead times which in turn caused reliability problems, as is con rmed in the 2019 State of DevOps Report.10 In the spring of 2009, as part of what Snyder called “the great Etsy cultural transformation,” Chad Dickerson joined as the new CTO. Dickerson put into motion many things, including a massive investment into site stability, having developers perform their own deployments into production, as well as beginning a two-year journey to eliminate Sprouter.11 To do this, the team decided to move all the business logic from the database layer into the application layer, removing the need for Sprouter. They created a small team that wrote a PHP object-relational mapping (ORM) layer,* enabling the front-end developers to make calls directly to

the database and reducing the number of teams required to change business logic from three teams down to one team.12 As Snyder described, “We started using the ORM for any new areas of the site and migrated small parts of our site from Sprouter to the ORM over time. It took us two years to migrate the entire site off of Sprouter. And even though we all grumbled about Sprouter the entire time, it remained in production throughout.”13 By eliminating Sprouter, Etsy also eliminated the problems associated with multiple teams needing to coordinate for business logic changes, decreased the number of handoffs, and signi cantly increased the speed and success of production deployments, improving site stability. Furthermore, because small teams could independently develop and deploy their code without requiring another team to make changes in other areas of the system, developer productivity increased. Sprouter was nally removed from production and Etsy’s version control repositories in early 2001. As Snyder said, “Wow, it felt good.”14† As Snyder and Etsy experienced, how we design our organization dictates how work is performed and, therefore, the outcomes we achieve. Throughout the rest of this chapter, we will explore how Conway’s Law can negatively impact the performance of our value stream and, more importantly, how we organize our teams to use Conway’s Law to our advantage.

Organizational Archetypes

In the eld of decision sciences, there are three primary types of organizational structures that inform how we design our DevOps value streams with Conway’s Law in mind: functional, matrix, and market. They are de ned by Dr. Roberto Fernandez as follows:16

  - Functional-oriented organizations optimize for expertise,

division of labor, or reducing cost. These organizations centralize expertise, which helps enable career growth and skill development, and they often have tall hierarchical organizational structures. This has been the prevailing method of organization for Operations

(i.e., server admins, network admins, database admins, and so forth are all organized into separate groups).

  - Matrix-oriented organizations attempt to combine functional

and market orientation. However, as many who work in or manage matrix organizations observe, they often result in complicated organizational structures, such as individual contributors reporting to two managers or more, and sometimes achieving neither the goals of functional or market orientation.‡

  - Market-oriented organizations optimize for responding quickly

to customer needs. These organizations tend to be at, composed of multiple cross-functional disciplines (e.g., marketing, engineering, etc.), which often leads to potential redundancies across the organization. This is how many prominent organizations adopting DevOps operate—in extreme examples, such as at Amazon or Net ix, each service team is simultaneously responsible for feature delivery and service support.§

With these three categories of organizations in mind, let’s explore further how an overly functional orientation, especially in Operations, can cause undesired outcomes in the technology value stream, as Conway’s Law would predict.

Problems Often Caused by Overly Functional Orientation

(“Optimizing for Cost”)

In traditional IT Operations organizations, we often use functional orientation to organize our teams by their specialties. We put the database administrators in one group, the network administrators in another, the server administrators in a third, and so forth. One of the most visible consequences of this is long lead times, especially for complex activities like large deployments where we must open up tickets with multiple groups and coordinate work handoffs, resulting in our work waiting in long queues at every step. Compounding the issue, the person performing the work often has little visibility or understanding of how their work relates to any value

stream goals (e.g., “I’m just con guring servers because someone told me to.”). This places workers in a creativity and motivation vacuum. The problem is exacerbated when each Operations functional area has to serve multiple value streams (i.e., multiple Development teams) who all compete for their scarce cycles. In order for Development teams to get their work done in a timely manner, we often have to escalate issues to a manager or director, and eventually to someone (usually an executive) who can nally prioritize the work against the global organizational goals instead of the functional silo goals. This decision must then get cascaded down into each of the functional areas to change the local priorities, and this, in turn, slows down other teams. When every team expedites their work, the net result is that every project ends up moving at the same slow crawl. In addition to long queues and long lead times, this situation results in poor handoffs, large amounts of rework, quality issues, bottlenecks, and delays. This gridlock impedes the achievement of important organizational goals, which often far outweigh the desire to reduce costs.¶ Similarly, functional orientation can also be found with centralized QA and Infosec functions, which may have worked ne (or at least, well enough) when performing less frequent software releases. However, as we increase the number of Development teams and their deployment and release frequencies, most functionally oriented organizations will have difficulty keeping up and delivering satisfactory outcomes, especially when their work is being performed manually. Now, we’ll study how marketoriented organizations work.

Enable Market-Oriented Teams (“Optimizing for Speed”)

Broadly speaking, to achieve DevOps outcomes, we need to reduce the effects of functional orientation (“optimizing for cost”) and enable market orientation (“optimizing for speed”) so we can have many small teams working safely and independently, quickly delivering value to the customer. Taken to the extreme, market-oriented teams are responsible not only for feature development but also for testing, securing, deploying, and

supporting their service in production, from idea conception to retirement. These teams are designed to be cross-functional and independent—able to design and run user experiments, build and deliver new features, deploy and run their service in production, and x any defects without manual dependencies on other teams, thus enabling them to move faster. This model has been adopted by Amazon and Net ix and is touted by Amazon as one of the primary reasons behind their ability to move fast even as they grow.18 To achieve market orientation, we won’t do a large, top-down reorganization, which often creates large amounts of disruption, fear, and paralysis. Instead, we will embed the functional engineers and skills (e.g., Ops, QA, Infosec) into each service team, or create a platform organization that provides an automated technology platform for service teams to selfserve everything they need to test, deploy, monitor, and manage their services in testing and production environments. This enables each service team to independently deliver value to the customer without having to open tickets with other groups, such as IT Operations, QA, or Infosec.** Research supports this approach: DORA’s 2018 and 2019 State of DevOps Reports found that teams see superior performance in speed and stability when functional work like database change management, QA, and Infosec is integrated throughout the software delivery process.19

Making Functional Orientation Work

Having just recommended market-orientated teams, it is worth pointing out that it is possible to create effective, high-velocity organizations with functional orientation. Cross-functional and market-oriented teams are one way to achieve fast ow and reliability, but they are not the only path. We can also achieve our desired DevOps outcomes through functional orientation, as long as everyone in the value stream views customer and organizational outcomes as a shared goal, regardless of where they reside in the organization.

Left: Functional orientation: all work ows through centralized IT Operations. Right: Market orientation: all product teams can deploy their loosely coupled components selfservice into production. Source: Humble, Molesky, and O’Reilly, Lean Enterprise, Kindle edition, 4523 & 4592.

For example, high performance with a functional-oriented and centralized Operations group is possible, as long as service teams get what they need from Operations reliably and quickly (ideally on demand) and vice versa. Many of the most admired DevOps organizations retain functional orientation of Operations, including Etsy, Google, and GitHub. What these organizations have in common is a high-trust culture that enables all departments to work together effectively, where all work is transparently prioritized and there is sufficient slack in the system to allow high-priority work to be completed quickly. This is, in part, enabled by automated self-service platforms that build quality into the products everyone is building. In the Lean manufacturing movement of the 1980s, many researchers were puzzled by Toyota’s functional orientation, which was at odds with the best practice of having cross-functional, market-oriented teams. They were so puzzled it was called “the second Toyota paradox.”20

As Mike Rother wrote in Toyota Kata,

As tempting as it seems, one cannot reorganize your way to continuous improvement and adaptiveness. What is decisive is not the form of the organization, but how people act and react. The roots of Toyota’s success lie not in its organizational structures, but in developing capability and habits in its people. It surprises many people, in fact, to find that Toyota is largely organized in a traditional, functional-department style.21

It is this development of habits and capabilities in people and the workforce that are the focus of our next sections.

Testing, Operations, and Security as Everyone’s Job Every Day

In high-performing organizations, everyone within a team shares a common goal—quality, availability, and security aren’t the responsibility of individual departments but are a part of everyone’s job every day. This means that the most urgent problem of the day may be working on or deploying a customer feature or xing a Sev 1 production incident. Alternatively, the day may require reviewing a fellow engineer’s change, applying emergency security patches to production servers, or making improvements so that fellow engineers are more productive. Re ecting on shared goals between Development and Operations, Jody Mulkey, CTO at Ticketmaster, said, “For almost 25 years, I used an American football metaphor to describe Dev and Ops. You know, Ops is defense, who keeps the other team from scoring, and Dev is offense, trying to score goals. And one day, I realized how awed this metaphor was, because they never all play on the eld at the same time. They’re not actually on the same team!”22 He continued, “The analogy I use now is that Ops are the offensive linemen, and Dev are the ‘skill’ positions (like the quarterback and wide receivers) whose job it is to move the ball down the eld—the job of Ops is to help make sure Dev has enough time to properly execute the plays.”23 A striking example of how shared pain can reinforce shared goals is when Facebook was undergoing enormous growth in 2009. They were

experiencing signi cant problems related to code deployments—while not all issues caused customer-impacting issues, there was chronic re ghting and long hours. Pedro Canahuati, their director of production engineering, described a meeting full of Ops engineers where someone asked that all people not working on an incident close their laptops, and no one could.24 One of the most signi cant things they did to help change the outcomes of deployments was to have all Facebook engineers, engineering managers, and architects rotate through on-call duty for the services they built. By doing this, everyone who worked on the service experienced visceral feedback on the upstream architectural and coding decisions they made, which made an enormous positive impact on the downstream outcomes.

Enable Every Team Member to Be a Generalist

In extreme cases of a functionally oriented Operations organization, we have departments of specialists, such as network administrators, storage administrators, and so forth. When departments over specialize, it causes siloization, which Dr. Spear describes as when departments “operate more like sovereign states.”25 Any complex operational activity then requires multiple handoffs and queues between the different areas of the infrastructure, leading to longer lead times (e.g., because every network change must be made by someone in the networking department). Because we rely upon an ever-increasing number of technologies, we must have engineers who have specialized and achieved mastery in the technology areas we need. However, we don’t want to create specialists who are “frozen in time,” only understanding and able to contribute to that one area of the value stream. One countermeasure is to enable and encourage every team member to be a generalist. We do this by providing opportunities for engineers to learn all the skills necessary to build and run the systems they are responsible for, and regularly rotating people through different roles. The term full-stack engineer is now commonly used (sometimes as a rich source of parody) to describe generalists who are familiar—at least have a general

level of understanding—with the entire application stack (e.g., application code, databases, operating systems, networking, cloud).

Table 7.1: Specialists vs. Generalists vs. “E-Shaped” Staff (experience, expertise, exploration, and execution)

“I-shaped” (Specialists)           “T-shaped” (Generalists)           “E-shaped”

Deep expertise in Deep expertise in one area          Deep expertise in one area a few areas

Experience across many areas Very few skills or experience in Broad skills across many areas     Proven execution other areas skills Always innovating

Can step up to remove           Almost limitless Creates bottlenecks quickly bottlenecks                   potential

Insensitive to downstream waste      Sensitive to downstream waste — and impact                          and impact

Prevents planning exibility or     Helps make planning exible and — absorption of variability              absorbs variability

Source: Scott Prugh, “Continuous Delivery,” ScaledAgileFramework.com, February 14, 2013, http://scaledagileframework.com/continuous-delivery/.

Scott Prugh writes that CSG International has undergone a transformation that brings most resources required to build and run the product onto one team, including analysis, architecture, development, test, and operations. “By cross-training and growing engineering skills, generalists can do orders of magnitude more work than their specialist counterparts, and it also improves our overall ow of work by removing queues and wait time.”26 This approach is at odds with traditional hiring practices, but, as Prugh explains, it is well worth it. “Traditional managers will often object to hiring engineers with generalist skill sets, arguing that they are more expensive and that ‘I can hire two server administrators for every multi-

skilled operations engineer.’”27 However, the business bene ts of enabling faster ow are overwhelming. Furthermore, as Prugh notes, “[I]nvesting in cross training is the right thing for [employees’] career growth and makes everyone’s work more fun.”28 When we value people merely for their existing skills or performance in their current role rather than for their ability to acquire and deploy new skills, we (often inadvertently) reinforce what Dr. Carol Dweck describes as the xed mindset, where people view their intelligence and abilities as static “givens” that can’t be changed in meaningful ways.29 Instead, we want to encourage learning, help people overcome learning anxiety, help ensure that people have relevant skills and a de ned career road map, and so forth. By doing this, we help foster a growth mindset in our engineers—after all, a learning organization requires people who are willing to learn. By encouraging everyone to learn, as well as providing training and support, we create the most sustainable and least expensive way to create greatness in our teams—by investing in the development of the people we already have. As Jason Cox, Director of Systems Engineering at Disney, described, “Inside of Operations, we had to change our hiring practices. We looked for people who had ‘curiosity, courage, and candor,’ who were not only capable of being generalists but also renegades. . . . We want to promote positive disruption so our business doesn’t get stuck and can move into the future.”30 As we’ll see in the next section, how we fund our teams also affects our outcomes.

Fund Not Projects but Services and Products

Another way to enable high-performing outcomes is to create stable service teams with ongoing funding to execute their own strategy and road map of initiatives. These teams have the dedicated engineers needed to deliver on concrete commitments made to internal and external customers, such as features, stories, and tasks. Contrast this to the more traditional model where Development and Test teams are assigned to a “project” and then reassigned to another project as soon as the project is completed and funding runs out. This

leads to all sorts of undesired outcomes, including developers being unable to see the long-term consequences of decisions they make (a form of feedback) and a funding model that only values and pays for the earliest stages of the software life cycle—which, tragically, is also the least expensive part for successful products or services.†† Our goal with a product-based funding model is to value the achievement of organizational and customer outcomes, such as revenue, customer lifetime value, or customer adoption rate, ideally with the minimum of output (e.g., amount of effort or time, lines of code). Contrast this to how projects are typically measured, such as whether they are completed within the promised budget, time, and scope.

Design Team Boundaries in Accordance with Conway’s Law

As organizations grow, one of the largest challenges is maintaining effective communication and coordination between people and teams, and creating and maintaining a shared understanding and mutual trust becomes even more important. As many teams shift to embrace new patterns of work, the importance of collaboration is becoming even more apparent. It is common for teams to now include fully remote, hybrid, and distributed work con gurations with team members stretched across not only office or home boundaries but time zones and sometimes even contractual boundaries (such as when work is performed by an outsourced team). Collaboration is further impeded when the primary communication mechanisms are work tickets and change requests.‡‡ As we saw in the Etsy Sprouter example at the beginning of this chapter, the way we organize teams can create poor outcomes, a side effect of Conway’s Law. These include splitting teams by function (e.g., by putting developers and testers in different locations or by outsourcing testers entirely) or by architectural layer (e.g., application, database). These con gurations require signi cant communication and coordination between teams, but still result in a high amount of rework, disagreements over speci cations, poor handoffs, and people sitting idle waiting for somebody else.

Ideally, our software architecture should enable small teams to be independently productive, sufficiently decoupled from each other so that work can be done without excessive or unnecessary communication and coordination.

Create Loosely Coupled Architectures to Enable Developer

Productivity and Safety

When we have a tightly coupled architecture, small changes can result in large-scale failures. As a result, anyone working in one part of the system must constantly coordinate with anyone else working in another part of the system they may affect, including navigating complex and bureaucratic change management processes. Furthermore, to test that the entire system works together requires integrating changes with the changes from hundreds, or even thousands, of other developers, which may, in turn, have dependencies on tens, hundreds, or thousands of interconnected systems. Testing is done in scarce integration test environments, which often require weeks to obtain and con gure. The result is not only long lead times for changes (typically measured in weeks or months) but also low developer productivity and poor deployment outcomes. In contrast, when we have an architecture that enables small teams of developers to independently implement, test, and deploy code into production safely and quickly, we can increase and maintain developer productivity and improve deployment outcomes. These characteristics can be found in service-oriented architectures (SOAs) rst described in the 1990s, in which services are independently testable and deployable. A key feature of SOAs is that they’re composed of loosely coupled services with bounded contexts.§§ Having architecture that is loosely coupled means that services can update in production independently, without having to update other services. Services must be decoupled from other services and, just as important, from shared databases (although they can share a database service, provided they don’t have any common schemas).

Bounded contexts are described in the book Domain-Driven Design by Eric J. Evans. The idea is that developers should be able to understand and update the code of a service without knowing anything about the internals of its peer services. Services interact with their peers strictly through APIs and thus don’t share data structures, database schemata, or other internal representations of objects. Bounded contexts ensure that services are compartmentalized and have well-de ned interfaces, which also enable easier testing. Randy Shoup, former Engineering Director for Google App Engine, observed that “organizations with these types of service-oriented architectures, such as Google and Amazon, have incredible exibility and scalability. These organizations have tens of thousands of developers where small teams can still be incredibly productive.”33

Keep Team Sizes Small (the “Two-Pizza Team” Rule)

Conway’s Law helps us design our team boundaries in the context of desired communication patterns but it also encourages us to keep our team sizes small, reducing the amount of inter-team communication and encouraging us to keep the scope of each team’s domain small and bounded. As part of its transformation initiative away from a monolithic code base in 2002, Amazon used the two-pizza rule to keep team sizes small—a team only as large as can be fed with two pizzas—usually about ve to ten people.34 This limit on size has four important effects:

  - It ensures the team has a clear, shared understanding of the

system they are working on. As teams get larger, the amount of communication required for everybody to know what’s going on scales in a combinatorial fashion.

  - It limits the growth rate of the product or service being worked

on. By limiting the size of the team, we limit the rate at which their system can evolve. This also helps to ensure the team maintains a shared understanding of the system.

 - It decentralizes power and enables autonomy. Each two-pizza

team (2PT) is as autonomous as possible. The team’s lead, working with the executive team, decides on the key business metric that the team is responsible for, known as the tness function, which becomes the overall evaluation criteria for the team’s experiments. The team is then able to act autonomously to maximize that metric.¶¶

 - Leading a two-pizza team is a way for employees to gain some

leadership experience in an environment where failure does not have catastrophic consequences. An essential element of Amazon’s strategy was the link between the organizational structure of a two-pizza team and the architectural approach of a serviceoriented architecture.

Amazon CTO, Werner Vogels, explained the advantages of this structure to Larry Dignan of Baseline in 2005. Dignan writes:

Small teams are fast . . . and don’t get bogged down in so-called administrivia. . . . Each group assigned to a particular business is completely responsible for it. . . . The team scopes the fix, designs it, builds it, implements it and monitors its ongoing use. This way, technology programmers and architects get direct feedback from the business people who use their code or applications—in regular meetings and informal conversations.36

## Continuous Learning

In Team Topologies: Organizing Business and Technology Teams for Fast Flow, Matthew Skelton and Manuel Pais present team and organizational patterns to optimize software delivery. The book illustrates an important theme shared in this chapter: good team designs reinforce good software delivery, and good software delivery reinforces more effective teams. Skelton and Pais also highlight best practices for teams:

     - Trust and communication take time. They suggest it

takes at least three months for team members to reach high performance, and suggest keeping teams together at least a year to bene t from their work together.

     - Just-right sizing. They suggest eight is an ideal

number, which is similar to the two-pizza team used by Amazon, and note that 150 is an upper limit (citing Dunbar’s number).***

     - Communication (can be) expensive. Skelton and Pais

wisely point out that while within-team communication is good, any time teams have demands or constraints on other teams, it leads to queues, context switching, and overhead.

The authors also outline four types of teams, and discuss strengths and weaknesses based on the organization, cognitive load requirements of each, and modes of team interaction.

     - Stream-aligned teams: An end-to-end team that owns

the full value stream. This is similar to the market orientation described here.

     - Platform teams: Platform teams create and support

reusable technology often used by stream-aligned

teams, such as infrastructure or content management. This team may often be a third party.

            - Enabling teams: This team contains experts who help

other teams improve, such as a Center of Excellence.

            - Complicated-subsystem teams: Teams that own

development and maintenance of a subcomponent of the system that is so complicated it requires specialist knowledge.

            - Other: The authors also touch on other team types,

such as SRE (site reliability engineer) and service experience.

Another example of how architecture can profoundly improve productivity is the API Enablement program at Target, Inc.

## Case Study

API Enablement at Target (2015)

Target is the sixth-largest retailer in the US and spends over $1 billion

on   technology      annually.        Heather     Mickman,        a   former      director     of

development        for   Target,   described       the   beginnings        of   their   DevOps

journey: “In the bad old days, it used to take ten different teams to

provision a server at Target, and when things broke, we tended to

stop   making      changes       to     prevent   further      issues,   which     of    course

makes everything worse.”

The     hardships      associated          with     ge    ing    environments            and

performing         deployments            created        significant        difficulties         for

development teams, as did ge               ing access to data they needed.

As Mickman described:

The   problem       was   that     much     of    our   core   data,     such     as

information on inventory, pricing, and stores, was locked

up    in   legacy   systems        and     mainframes.         We   often         had

multiple sources of truths of data, especially between e-

commerce and our physical stores, which were owned by

different teams, with different data structures and different

priorities. . . .

The result was that if a new development team wanted

to build something for our guests, it would take three to

six months to build the integrations to get the data they

needed. Worse, it would take another three to six months

to do the manual testing to make sure they didn’t break

anything critical because of how many custom point-to-

point integrations we had in a very tightly coupled system.

Having     to    manage       the    interactions            with   the   twenty       to

thirty different teams, along with all their dependencies,

required     lots      of   project       managers           because      of    all   the

coordination and handoffs. It meant that development was

spending        all   their   time    waiting           in   queues       instead      of

delivering results and ge             ing stuff done.

This     long    lead      time    for   retrieving         and    creating        data   in    their

systems      of   record      jeopardized         important          business     goals,      such    as

integrating the supply chain operations of Target’s physical stores and

their    e-commerce           site,   which       now   required           ge   ing    inventory      to

stores and customer homes. This pushed the Target supply chain well

beyond what it was designed for, which was merely to facilitate the

movement of goods from vendors to distribution centers and stores.

In an a       empt to solve the data problem, in 2012 Mickman led the

API Enablement team to enable development teams to “deliver new

capabilities       in    days       instead       of   months.”             They       wanted        any

engineering team inside Target to be able to get and store the data

they needed, such as information on their products or their stores,

including operating hours, location, whether there was a Starbucks

on-site, and so forth.

Time       constraints          played    a    large    role      in    team       selection.     As

Mickman explained:

Because     our       team    also   needed        to   deliver     capabilities       in

days, not months, I needed a team who could do the work,

not give it to contractors—we wanted people with kickass

engineering skills, not people who knew how to manage

contracts.           And     to   make    sure   our    work       wasn’t     si   ing   in

queue, we needed to own the entire stack, which meant

that we took over the Ops requirements as well. . . . We

brought             in   many       new    tools    to      support         continuous

integration and continuous delivery. And because we knew

that      if   we        succeeded,       we     would      have       to   scale     with

extremely high growth, we brought in new tools such as

the Cassandra database and Kata message broker. When

we asked for permission, we were told no, but we did it

anyway because we knew we needed it.

In   the   following          two    years,   the   API      Enablement        team       enabled

fifty-three new business capabilities, including Ship to Store and Gift

Registry, as well as their integrations with Instacart and Pinterest. As

Mickman described, “Working with Pinterest suddenly became very

easy, because we just provided them our APIs.”

In 2014, the API Enablement team served over 1.5 billion API calls

per   month.          By    2015,   this   had    grown    to      seventeen       billion   calls   per

month and spanning ninety different APIs. To support this capability,

they routinely performed eighty deployments per week.

These changes have created major business benefits for Target—

digital     sales      increased         42%     during   the      2014       holiday     season     and

increased another 32% in Q2. During the Black Friday weekend of

2015, over 280,000 in-store pickup orders were created. By 2015, their

goal was to enable 450 of their 1,800 stores to be able to fulfill e-

commerce orders, up from one hundred.

“The    API      Enablement          team     shows      what       a   team   of    passionate

change agents can do,” Mickman says. “And it helped set us up for the

next stage, which is to expand DevOps across the entire technology

organization.”

This case study is takeaway rich, but one of the clearest pictures it paints is how architecture affects the size and organization of a team and vice versa, per Conway’s Law.

Conclusion

Through the Etsy and Target case studies, we can see how architecture and organizational design can dramatically improve our outcomes. Done incorrectly, Conway’s Law will ensure that the organization creates poor outcomes, preventing safety and agility. Done well, the organization enables developers to safely and independently develop, test, and deploy value to the customer.

* Among many things, an ORM abstracts a database, enabling developers to conduct queries and

data manipulation as if they were merely another object in the programming language. Popular ORMs include Hibernate for Java, SQLAlchemy for Python, and ActiveRecord for Ruby on Rails. † Sprouter was one of many technologies used in development and production that Etsy eliminated as part of their transformation.15 ‡ For more on how to work with matrix-oriented organizations, check out the DevOps Enterprise Forum paper Making Matrixed Organizations Successful with DevOps: Tactics for Transformation in a Less Than Optimal Organization, which you can download at ITRevolution.com/Resources. § However, as will be explained later, equally prominent organizations such as Etsy and GitHub have functional orientation. ¶ Adrian Cockcroft remarked, “For companies who are now coming off of five-year IT outsourcing contracts, it’s like they’ve been frozen in time, during one of the most disruptive times in technology.”17 In other words, IT outsourcing is a tactic used to control costs through contractually enforced stasis, with firm fixed prices that schedule annual cost reductions. However, it often results in organizations being unable to respond to changing business and technology needs. ** For the remainder of this book, we will use service teams interchangeably with feature teams, product teams, development teams, and delivery teams. The intent is to specify the team primarily developing, testing, and securing the code so that value is delivered to the customer. †† As John Lauderbach, VP of Information Technology at Roche Bros. Supermarkets, quipped, “Every new application is like a free puppy. It’s not the upfront capital cost that kills you. . . . It’s the ongoing maintenance and support.”31 ‡‡ When the first edition was released, most work cultures did not embrace remote or hybrid arrangements. In the intervening years, advancing technology, shifting norms, and the COVID-19 pandemic have shown teams and organizations that remote work and hybrid schedules are not only possible but productive. As such, this paragraph has been modified to account for shifting ways of working. §§ These properties are also found in “microservices,” which build upon the principles of SOA. One popular set of patterns for modern web architecture based on these principles is the “12-factor app.”32

¶¶ In the Netflix culture, one of the seven key values is “highly aligned, loosely coupled.”35 *** Dunbar's number refers to the number of people with whom one can maintin stable social relationships with (150). It was created by British anthropologist Robin Dunbar in the 1990s.


---

<div align="center">

[« Previous Chapter](./14_chapter_6_understanding_the_work_in_our_value.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./16_chapter_8_how_to_get_great_outcomes_by.md)

</div>
