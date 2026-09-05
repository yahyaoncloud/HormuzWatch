---
title: "Chapter 13: Architect For Low-risk Releases"
chapter: 23
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 288
word_count: 3401
estimated_tokens: 6760
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./22_chapter_12_automate_and_enable_low_risk_releases.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./24_part_iii_conclusion.md)

</div>

---

Almost every well-known DevOps exemplar has had near-death experiences due to architectural problems, such as in the stories presented about LinkedIn, Google, eBay, Amazon, and Etsy. In each case, they were able to successfully migrate to a more suitable architecture that addressed their current problems and organizational needs. This is the principle of evolutionary architecture—Jez Humble observes that architecture of “any successful product or organization will necessarily evolve over its life cycle.”1 Before his tenure at Google, Randy Shoup served as Chief Engineer and Distinguished Architect at eBay from 2004 to 2011. He observes that “both eBay and Google are each on their fth entire rewrite of their architecture from top to bottom.”2 He re ects, “Looking back with 20/20 hindsight, some technology [and architectural choices] look prescient and others look shortsighted. Each decision most likely best served the organizational goals at the time. If we had tried to implement the 1995 equivalent of micro-services out of the gate, we would have likely failed, collapsing under our own weight and probably taking the entire company with us.”3* The challenge is how to keep migrating from the architecture we have to the architecture we need. In the case of eBay, when they needed to rearchitect, they would rst do a small pilot project to prove to themselves that they understood the problem well enough to even undertake the effort. For instance, when Shoup’s team was planning on moving certain portions of the site to full-stack Java in 2006, they looked for the area that would get them the biggest bang for their buck by sorting the site pages by

revenue produced. They chose the highest revenue areas, stopping when there was not enough of a business return to justify the effort.5 What Shoup’s team did at eBay is a textbook example of evolutionary design, using a technique called the strangler g application pattern— instead of “ripping out and replacing” old services with architectures that no longer support our organizational goals, we put the existing functionality behind an API and avoid making further changes to it. All new functionality is then implemented in the new services that use the new desired architecture, making calls to the old system when necessary. The strangler g application pattern is especially useful for helping migrate portions of a monolithic application or tightly coupled services to one that is more loosely coupled. All too often, we nd ourselves working within an architecture that has become too tightly coupled and too interconnected, often having been created years (or decades) ago. The consequences of overly tight architectures are easy to spot: every time we attempt to commit code into trunk or release code into production, we risk creating global failures (e.g., we break everyone else’s tests and functionality or the entire site goes down). To avoid this, every small change requires enormous amounts of communication and coordination over days or weeks, as well as approvals from any group that could potentially be affected. Deployments become problematic as well—the number of changes that are batched together for each deployment grows, further complicating the integration and test effort, and increasing the already high likelihood of something going wrong. Even deploying small changes may require coordinating with hundreds (or even thousands) of other developers, with any one of them able to create a catastrophic failure, potentially requiring weeks to nd and x the problem. (This results in another symptom: “My developers spend only 15% of their time coding—the rest of their time is spent in meetings.”) These all contribute to an extremely unsafe system of work, where small changes have seemingly unknowable and catastrophic consequences. It also often contributes to a fear of integrating and deploying our code, and the self-reinforcing downward spiral of deploying less frequently.

From an enterprise architecture perspective, this downward spiral is the consequence of the Second Law of Architectural Thermodynamics, especially in large, complex organizations. Charles Betz, author of Architecture and Patterns for IT: Service Management, Resource Planning, and Governance: Making Shoes for the Cobbler’s Children, observes, “[IT project owners] are not held accountable for their contributions to overall system entropy.”6 In other words, reducing our overall complexity and increasing the productivity of all our development teams is rarely the goal of an individual project. In this chapter, we will describe steps we can take to reverse the downward spiral, review the major architectural archetypes, examine the attributes of architectures that enable developer productivity, testability, deployability, and safety, as well as evaluate strategies that allow us to safely migrate from whatever current architecture we have to one that better enables the achievement of our organizational goals.

An Architecture that Enables Productivity, Testability, and Safety

In contrast to a tightly coupled architecture that can impede everyone’s productivity and ability to safely make changes, a loosely coupled architecture with well-de ned interfaces that enforce how modules connect with each other promotes productivity and safety. It enables small, productive teams that are able to make small changes that can be safely and independently deployed. And because each service also has a well-de ned API, it enables easier testing of services and the creation of contracts and SLAs between teams.

Source: Shoup, “From the Monolith to Micro-services.”

As Randy Shoup describes,

This type of architecture has served Google extremely well—for a service like Gmail, there’s five or six other layers of services underneath it, each very focused on a very specific function. Each service is supported by a small team, who builds it and runs their functionality, with each group potentially making different technology choices. Another example is the Google Cloud Datastore service, which is one of the largest NoSQL services in the world—and yet it is supported by a team of only about eight people, largely because it is based on layers upon layers of dependable services built upon each other.7

This kind of service-oriented architecture allows small teams to work on smaller and simpler units of development that each team can deploy independently, quickly, and safely. Shoup notes, “Organizations with these

types of architectures, such as Google and Amazon, show how it can impact organizational structures, [creating] exibility and scalability. These are both organizations with tens of thousands of developers, where small teams can still be incredibly productive.”8

Architectural Archetypes: Monoliths vs. Microservices

At some point in their history, most DevOps organizations were hobbled by tightly coupled, monolithic architectures that—while extremely successful at helping them achieve product/market t—put them at risk of organizational failure once they had to operate at scale (e.g., eBay’s monolithic C++ application in 2001, Amazon’s monolithic Obidos application in 2001, Twitter’s monolithic Rails front end in 2009, and LinkedIn’s monolithic Leo application in 2011). In each of these cases, the organization was able to re-architect their systems and set the stage not only to survive but also to thrive and win in the marketplace. Monolithic architectures are not inherently bad—in fact, they are often the best choice for an organization early in a product life cycle. As Randy Shoup observes,

There is no one perfect architecture for all products and all scales. Any architecture meets a particular set of goals or range of requirements and constraints, such as time to market, ease of developing functionality, scaling, etc. The functionality of any product or service will almost certainly evolve over time—it should not be surprising that our architectural needs will change as well. What works at scale 1x rarely works at scale 10x or 100x.9

The major architectural archetypes are shown in Table 13.1. Each row indicates a different evolutionary need for an organization, with each column giving the pros and cons of each of the different archetypes. As the table shows, a monolithic architecture that supports a startup (e.g., rapid prototyping of new features and potential pivots or large changes in strategies) is very different from an architecture that needs hundreds of teams of developers, each of whom must be able to independently deliver value to the customer. By supporting evolutionary architectures, we can

ensure that our architecture always serves the current needs of the organization.

Table 13.1: Architectural Archetypes

Pros                          Cons

                                                                   - Coordination

                                        - Simple at first

overhead increases as

                                        - Low interprocess

team grows latencies

                                                                   - Poor enforcement of

Monolithic v1 (all functionality in   • Single code base; modularity one application)                one deployment

                                                                   - Poor scaling

unit

                                                                   - All-or-nothing deploy

                                        - Resource efficient

(downtime, failures) at small scales

                                                                   - Long build times

                                                                   - Tendency for

increased coupling

                                        - Simple at first

over time

                                        - Join queries are

Monolithic v2 (sets of monolithic                                • Poor scaling and easy tiers: “front end presentation,”                                 redundancy (all-or-

                                        - Single schema,

“application server,” “database                                  nothing, vertical only) deployment layer”)                                           • Difficult to tune

                                        - Resource efficient

properly at small scales

                                                                   - All-or-nothing schema

management

                                        - Each unit is simple

                                        - Independent

                                                                   - Many cooperating

scaling and units performance

                                                                   - Many small repos

Microservice (modular,           • Independent

                                                                   - Requires more

independent, graph relationship vs.     testing and sophisticated tooling tiers, isolated persistence)        deployment and dependency

                                        - Can optimally tune

management performance

                                                                   - Network latencies

(caching, replication, etc.)

Source: Shoup, “From the Monolith to Micro-services.”

## Case Study

Evolutionary Architecture at Amazon (2002)

One   of   the     most        studied     architecture       transformations              occurred       at

Amazon.      In     an     interview        with     ACM          Turing    Award-winner                and

Microsoft      Technical           Fellow    Jim    Gray,     Amazon        CTO        Werner       Vogels

explains     that        Amazon.com           started        in    1996        as     a    “monolithic

application, running on a web server, talking to a database on the

back end. This application, dubbed Obidos, evolved to hold all the

business    logic,       all   the   display      logic,     and   all   the    functionality           that

Amazon             eventually            became              famous            for:        similarities,

recommendations, Listmania, reviews, etc.”

As time went by, Obidos grew too tangled, with complex sharing

relationships       meaning          individual         pieces     could       not     be       scaled    as

needed.     Vogels       tells    Gray     that   this     meant        “many       things       that   you

would like to see happening in a good software environment couldn’t

be   done    anymore;           there    were      many       complex       pieces         of    software

combined into a single system. It couldn’t evolve anymore.”

Describing          the      thought         process      behind          the        new     desired

architecture,       he    tells    Gray,   “We     went      through       a    period      of    serious

introspection        and       concluded         that    a   service-oriented              architecture

would give us the level of isolation that would allow us to build many

software components rapidly and independently.”

Vogels   notes,       “The      big   architectural          change    that      Amazon        went

through in the past five years [from 2001–2005] was to move from a

two-tier    monolith            to   a   fully     distributed,          decentralized           services

platform serving many different applications. A lot of innovation was

necessary to make this happen, as we were one of the first to take this

approach.”         The lessons from Vogel’s experience at Amazon that are

important     to     our       understanding        of     architecture         shifts      include       the

following:

     - Lesson 1: When applied rigorously, strict service orientation

is an excellent technique to achieve isolation; you achieve a

level of ownership and control that was not seen before.

     - Lesson       2:    Prohibiting        direct      database        access       by    clients

makes        performing        scaling      and      reliability    improvements             to

your service state possible without involving your clients.

       - Lesson    3:   Development           and   operational     process   greatly

benefits from switching to service orientation. The services

model     has   been   a   key    enabler   in   creating   teams   that   can

innovate quickly with a strong customer focus. Each service

has a team associated with it, and that team is completely

responsible      for       the    service—from        scoping       out    the

functionality to architecting, building, and operating it.

The extent to which applying these lessons enhances developer

productivity   and    reliability     is   breathtaking.   In    2011,   Amazon       was

performing approximately fifteen thousands deployment per day.                           By

2015, they were performing nearly 136,000 deployments per day.

This case study illustrates how evolving from a monolithic structure to one of microservices helped to decouple the architecture, allowing it to be er serve the needs of the organization.

Use the Strangler Fig Application Pa                   ern to Safely Evolve Our

Enterprise Architecture

The term strangler g application was coined by Martin Fowler in 2004 after he was inspired by seeing massive strangler vines during a trip to Australia, writing, “They seed in the upper branches of a g tree and gradually work their way down the tree until they root in the soil. Over many years they grow into fantastic and beautiful shapes, meanwhile strangling and killing the tree that was their host.”16 If we have determined that our current architecture is too tightly coupled, we can start safely decoupling parts of the functionality from our existing architecture. By doing this, we enable teams supporting the decoupled functionality to independently develop, test, and deploy their code into production with autonomy and safety, and reduce architectural entropy.

As described earlier, the strangler g application pattern involves placing existing functionality behind an API, where it remains unchanged, and implementing new functionality using our desired architecture, making calls to the old system when necessary. When we implement the strangler g applications, we seek to access all services through versioned APIs, also called versioned services or immutable services.17 Versioned APIs enable us to modify the service without impacting the callers, which allows the system to be more loosely coupled—if we need to modify the arguments, we create a new API version and migrate teams who depend on our service to the new version. After all, we are not achieving our re-architecting goals if we allow our new strangler g application to get tightly coupled into other services (e.g., connecting directly to another service’s database). If the services we call do not have cleanly de ned APIs, we should build them or at least hide the complexity of communicating with such systems within a client library that has a cleanly de ned API. By repeatedly decoupling functionality from our existing tightly coupled system, we move our work into a safe and vibrant ecosystem where developers can be far more productive, resulting in the legacy application shrinking in functionality. It might even disappear entirely as all the needed functionality migrates to our new architecture. By creating strangler g applications, we avoid merely reproducing existing functionality in some new architecture or technology—often, our business processes are far more complex than necessary due to the idiosyncrasies of the existing systems, which we will end up replicating. (By researching the user, we can often re-engineer the process so that we can design a far simpler and more streamlined means to achieving the business goal.)† An observation from Martin Fowler underscores this risk.

Much of my career has involved rewrites of critical systems. You would think such a thing is easy—just make the new one do what the old one did. Yet they are always much more complex than they seem, and overflowing with risk. The big cut-over date looms, and the pressure is on. While new features (there are always new features) are

liked, old stuff has to remain. Even old bugs often need to be added to the rewritten system.19

As with any transformation, we seek to create quick wins and deliver early incremental value before continuing to iterate. Up-front analysis helps us identify the smallest possible piece of work that will usefully achieve a business outcome using the new architecture.

## Case Study

Strangler Fig Pa           ern at Blackboard Learn (2011)

Blackboard       Inc.   is   one     of   the   pioneers      of   providing       technology           for

educational institutions, with annual revenue of approximately $650

million in 2011. At that time, the development team for their flagship

Learn     product,      packaged          software       that      was   installed     and    run        on

premises        at    their     customer          sites,     was    living     with        the     daily

consequences of a legacy J2EE codebase that went back to 1997.                                          As

David     Ashman,          their     chief      architect,     observed,           “we    still    have

fragments of Perl code still embedded throughout our codebase.”

In 2010, Ashman was focused on the complexity and growing lead

times     associated         with    the    old   system,      observing       that      “our     build,

integration,         and     testing      processes        kept    ge   ing    more      and      more

complex and error prone. And the larger the product got, the longer

our lead times and the worse the outcomes for our customers. To

even    get     feedback           from    our    integration       process        would      require

twenty-four to thirty-six hours.”

How       this    started       to    impact      developer     productivity         was      made

visible    to   Ashman         in    graphs       generated        from    their     source       code

repository going all the way back to 2005.

In

code in the monolithic Blackboard Learn code repository; the bo                                     om

graph     represents         the   number        of   code    commits.        The   problem        that

became evident to Ashman was that the number of code commits

started to decrease, objectively showing the increasing difficulty of

introducing          code     changes,       while      the    number         of   lines    of    code

continued to increase. Ashman noted, “To me, it said we needed to do

something, otherwise the problems would keep ge                          ing worse, with

23 no end in sight.”

Blocks Source: “DOES14—David Ashman—Blackboard Learn—Keep Your Head in the Clouds,” YouTube video, 30:43, posted by DevOps Enterprise Summit 2014, October 28, 2014, https://www.youtube.com/watch?v=SSmixnMpsI4.

As a result, in 2012 Ashman focused on implementing a code re-

architecting     project       that   used   the   strangler   fig   pa   ern.   The    team

accomplished       this      by   creating   what    they   internally      called   Building Blocks , which allowed developers to work in separate modules that

were decoupled from the monolithic codebase and accessed through

fixed     APIs.   This    enabled      them   to    work   with   far   more     autonomy,

without having to constantly communicate and coordinate with other

development teams.

When Building Blocks were made available to developers, the size

of   the   monolith          source   code   repository     began      to    decrease     (as

measured by number of lines of code). Ashman explained that this

was    because        developers       were     moving   their    code     into   the   Building

Block    modules        source     code   repository.      “In   fact,”   Ashman        reported,

“every   developer         given   a   choice     would    work    in     the   Building     Block

codebase, where they could work with more autonomy and freedom

and safety.”

growth in the number of lines of code and the exponential growth of

the    number         of   code     commits        for     the    Building        Blocks     code

repositories. The new Building Blocks codebase allowed developers to

be more productive, and they made the work safer because mistakes

resulted    in   small,    local   failures      instead   of    major     catastrophes       that

impacted the global system.

Blocks Source: “DOES14—David Ashman—Blackboard Learn—Keep Your Head in the Clouds,” YouTube video, 30:43, posted by DevOps Enterprise Summit 2014, October 28, 2014, https://www.youtube.com/watch?v=SSmixnMpsI4.

Ashman      concluded,        “Having       developers       work     in    the   Building

Blocks     architecture       made        for    impressive      improvements           in   code

modularity,       allowing    them        to    work   with     more      independence        and

freedom. In combination with the updates to our build process, they

also got faster, be   er feedback on their work, which meant be      er

25 quality.”

Utilizing the Strangler Fig Application Pa ern and creating a modular codebase, teams at Blackboard were able to work with more autonomy and tackle individual problems safer and faster.

## Continuous Learning

Data supports the importance of architecture and its role in driving elite performance, with the DORA and Puppet 2017 State of DevOps Report nding that architecture was the largest contributor to continuous delivery. The analysis found that teams who scored highest on architectural capabilities could complete their work independently of other teams, and change their systems without dependencies.26 These ndings were echoed in DORA’s 2018 and 2019 State of DevOps Reports, showing the continued importance of having a loosely coupled architecture in teams’ abilities to deploy and release quickly and with low friction.27

Conclusion

To a large extent, the architecture that our services operate within dictates how we test and deploy our code. Because we are often stuck with architectures that were optimized for a different set of organizational goals, or for an era long passed, we must be able to safely migrate from one architecture to another. The case studies presented in this chapter, as well as the Amazon case study previously presented, describe techniques like the strangler g pattern that can help us migrate between architectures incrementally, enabling us to adapt to the needs of the organization.

* eBay’s architecture went through the following phases: Perl and files (v1, 1995), C++ and Oracle (v2,

1997), XSL and Java (v3, 2002), full-stack Java (v4, 2007), Polyglot microservices (2013+).4 † The strangler fig application pattern involves incrementally replacing a whole system, usually a legacy system, with a completely new one. Conversely, branching by abstraction, a term coined by Paul Hammant, is a technique where we create an abstraction layer between the areas that we are changing. This enables evolutionary design of the application architecture while allowing everybody to work off trunk/master and practice continuous integration.18


---

<div align="center">

[« Previous Chapter](./22_chapter_12_automate_and_enable_low_risk_releases.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./24_part_iii_conclusion.md)

</div>
