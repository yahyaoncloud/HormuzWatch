---
title: "Chapter 11: Enable And Practice Continuous Integration"
chapter: 21
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 241
word_count: 3134
estimated_tokens: 5566
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./20_chapter_10_enable_fast_and_reliable_automated_testing.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./22_chapter_12_automate_and_enable_low_risk_releases.md)

</div>

---

In the previous chapter, we created automated testing practices to ensure that developers get fast feedback on the quality of their work. This becomes even more important as we increase the number of developers and the number of branches they work on in version control. The ability to “branch” in version control systems was created primarily to enable developers to work on different parts of the software system in parallel without the risk of individual developers checking in changes that could destabilize or introduce errors into trunk (sometimes also called master or mainline).* However, the longer developers are allowed to work in their branches in isolation, the more difficult it becomes to integrate and merge everyone’s changes back into trunk. In fact, integrating those changes becomes exponentially more difficult as we increase the number of branches and the number of changes in each code branch. Integration problems result in a signi cant amount of rework to get back into a deployable state, including con icting changes that must be manually merged or merges that break our automated or manual tests, usually requiring multiple developers to successfully resolve. And because integration has traditionally been done at the end of the project, when it takes far longer than planned, we are often forced to cut corners to make the release date. This causes another downward spiral: when merging code is painful, we tend to do it less often, making future merges even worse. Continuous integration was designed to solve this problem by making merging into trunk a part of everyone’s daily work.

HP’s LaserJet Firmware (2014)

The surprising breadth of problems that continuous integration solves, as well as the solutions themselves, are exempli ed in Gary Gruver’s experience as the director of engineering for HP’s LaserJet Firmware division, which builds the rmware that runs all their scanners, printers, and multifunction devices.1 The team consisted of four hundred developers distributed across the US, Brazil, and India. Despite the size of their team, they were moving far too slowly. For years, they were unable to deliver new features as quickly as the business needed. Gruver described the problem thus, “Marketing would come to us with a million ideas to dazzle our customer, and we’d just tell them, ‘Out of your list, pick the two things you’d like to get in the next six to twelve months.’”2 They were only completing two rmware releases per year, with the majority of their time spent porting code to support new products. Gruver estimated that only 5% of their time was spent creating new features—the rest of the time was spent on non-productive work associated with their technical debt, such as managing multiple code branches and manual testing, as shown below:3

  - 20% on detailed planning (their poor throughput and high lead

times were misattributed to faulty estimation, and so, hoping to get a better answer, they were asked to estimate the work in greater detail)

  - 25% spent porting code, all maintained on separate code branches

  - 10% spent integrating their code between developer branches

  - 15% spent completing manual testing

Gruver and his team created a goal of increasing the time spent on innovation and new functionality by a factor of ten. The team hoped this goal could be achieved through:4

  - continuous integration and trunk-based development

  - signi cant investment in test automation

  - creation of a hardware simulator so tests could be run on a virtual

platform

  - the reproduction of test failures on developer workstations

  - a new architecture to support running all printers off a common

build and release

Before this, each product line would require a new code branch, with each model having a unique rmware build with capabilities de ned at compile time.† The new architecture would have all developers working in a common code base, with a single rmware release supporting all LaserJet models built off of trunk, with printer capabilities being established at runtime in an XML con guration le. Four years later, they had one codebase supporting all twenty-four HP LaserJet product lines being developed on trunk. Gruver admits trunkbased development requires a big mindset shift.6 Engineers thought it would never work, but once they started they couldn’t imagine ever going back. Over the years, several engineers left HP, and they would call to tell Gruver about how backward development was in their new companies, pointing out how difficult it is to be effective and release good code when there is no feedback that continuous integration gives them.7 However, trunk-based development required them to build more effective automated testing. Gruver observed, “Without automated testing, continuous integration is the fastest way to get a big pile of junk that never compiles or runs correctly.”8 In the beginning, a full manual testing cycle required six weeks. In order to have all rmware builds automatically tested, they invested heavily in their printer simulators and created a testing farm in six weeks —within a few years, two thousand printer simulators ran on six racks of servers that would load the rmware builds from their deployment pipeline. Their continuous integration (CI) system ran their entire set of automated unit, acceptance, and integration tests on builds from trunk, just as described in the previous chapter. Furthermore, they created a culture that halted all work anytime a developer broke the deployment pipeline, ensuring that developers quickly brought the system back into a green state.9

Automated testing created fast feedback that enabled developers to quickly con rm that their committed code actually worked. Unit tests would run on their workstations in minutes, and three levels of automated testing would run on every commit as well as every two and four hours. The nal full regression testing would run every twenty-four hours. During this process, they:10

  - reduced the build to one build per day, eventually doing ten to

fteen builds per day

  - went from around twenty commits per day performed by a “build

boss” to over one hundred commits per day performed by individual developers

  - enabled developers to change or add between seventy- ve

thousand and one-hundred thousand lines of code each day

  - reduced regression test times from six weeks to one day

This level of productivity could never have been supported prior to adopting continuous integration, when merely creating a green build required days of heroics. The resulting business bene ts were astonishing:11

  - Time spent on driving innovation and writing new features

increased from 5% of developer time to 40%.

  - Overall development costs were reduced by approximately 40%.

  - Programs under development were increased by about 140%.

  - Development costs per program were decreased by 78%.

What Gruver’s experience shows is that after comprehensive use of version control, continuous integration is one of the most critical practices that enable the fast ow of work in our value stream, enabling many development teams to independently develop, test, and deliver value. Nevertheless, continuous integration remains a controversial practice. The remainder of this chapter describes the practices required to implement continuous integration, as well as how to overcome common objections.

Small Batch Development and What Happens When We Commit

Code to Trunk Infrequently

As we’ve described, whenever changes are introduced into version control that cause our deployment pipeline to fail, we quickly swarm the problem to x it, bringing our deployment pipeline back into a green state. However, signi cant problems result when developers work in longlived private branches (also known as “feature branches”), only merging back into trunk sporadically, resulting in a large batch-size of changes. As described in the HP LaserJet example, what results is signi cant chaos and rework in order to get their code into a releasable state. Jeff Atwood, founder of the Stack Over ow site and author of the Coding Horror blog, observes that while there are many branching strategies, they can all be put on the following spectrum:12

  - Optimize for individual productivity: Every single person on the

project works in their own private branch. Everyone works independently, and nobody can disrupt anyone else’s work; however, merging becomes a nightmare. Collaboration becomes almost comically difficult—every person’s work has to be painstakingly merged with everyone else’s work to see even the smallest part of the complete system.

  - Optimize for team productivity: Everyone works in the same

common area. There are no branches, just a long, unbroken straight line of development. Commits are simple, but each commit can break the entire project and bring all progress to a screeching halt.

Atwood’s observation is absolutely correct—stated more precisely, the required effort to successfully merge branches back together increases exponentially as the number of branches increases. The problem lies not only in the rework this “merge hell” creates, but also in the delayed feedback we receive from our deployment pipeline. For instance, instead of performance testing against a fully integrated system happening continuously, it will likely happen only at the end of our process. Furthermore, as we increase the rate of code production and add more developers, we increase the probability that any given change will impact

someone else and increase the number of developers who will be impacted when someone breaks the deployment pipeline. Here is one last troubling side effect of large batch size merges: when merging is difficult, we become less able and motivated to improve and refactor our code, because refactorings are more likely to cause rework for everyone else. When this happens, we are more reluctant to modify code that has dependencies throughout the codebase, which is (tragically) where we may have the highest payoffs. This is how Ward Cunningham, developer of the rst wiki, originally described technical debt: “when we do not aggressively refactor our codebase, it becomes more difficult to make changes and to maintain over time, slowing down the rate at which we can add new features.”13 Solving this problem was one of the primary reasons behind the creation of continuous integration and trunk-based development practices, to optimize for team productivity over individual productivity. We’ll go into a little more detail about adopting trunk-based development practices in the next section of this book.

Adopt Trunk-Based Development Practices

Our countermeasure to large batch size merges is to institute continuous integration and trunk-based development practices, where all developers check their code into trunk at least once per day. Checking in code this frequently reduces our batch size to the work performed by our entire developer team in a single day. The more frequently developers check their code into trunk, the smaller the batch size and the closer we are to the theoretical ideal of single-piece ow. Frequent code commits to trunk mean we can run all automated tests on our software system as a whole and receive alerts when a change breaks some other part of the application or interferes with the work of another developer. And because we can detect merge problems when they are small, we can correct them faster. We may even con gure our deployment pipeline to reject any commits (e.g., code or environment changes) that take us out of a deployable state. This method is called gated commits, where the deployment pipeline rst

con rms that the submitted change will successfully merge, build as expected, and pass all the automated tests before actually being merged into trunk. If not, the developer will be noti ed, allowing corrections to be made without impacting anyone else in the value stream. The discipline of daily code commits also forces us to break our work down into smaller chunks while still keeping trunk in a working, releasable state. Version control becomes an integral mechanism of how the team communicates with each other—everyone has a better shared understanding of the system, is aware of the state of the deployment pipeline, and can help each other when it breaks. As a result, we achieve higher quality and faster deployment lead times. Having these practices in place, we can now again modify our de nition of “done” (modi cation is in bold text): “At the end of each development interval, we must have integrated, tested, working, and potentially shippable code, demonstrated in a production-like environment, created from trunk using a one-click process, and validated with automated tests.” Adhering to this revised de nition of done helps us further ensure the ongoing testability and deployability of the code we’re producing. By keeping our code in a deployable state, we are able to eliminate the common practice of having a separate test and stabilization phase at the end of the project.

## Case Study

Continuous Integration at Bazaarvoice (2012)

Ernest Mueller, who helped engineer the DevOps transformation at

National    Instruments,        later   helped    transform           the   development         and

release    processes      at    Bazaarvoice       in   2012.          Bazaarvoice     supplies

customer-generated content (e.g., reviews, ratings) for thousands of

retailers, such as Best Buy, Nike, and Walmart.

At    that   time,   Bazaarvoice       had   $120      million     in   revenue   and       was

‡ preparing    for   an    IPO.        The   business        was   primarily     driven      by   the

Bazaarvoice Conversations application, a monolithic Java application

comprising       nearly   five       million   lines   of   code       dating   back   to   2006,

spanning       fifteen    thousand          files.   The      service       ran   on   1,200     servers

across four data centers and multiple cloud service providers.

Partially as a result of switching to an Agile development process

and two-week development intervals, there was a tremendous desire

to increase release frequency from their current ten-week production

release    schedule.        They   had     also   started     to    decouple        parts   of   their

monolithic application, breaking it down into microservices.

Their first a     empt at a two-week release schedule was in January

of 2012. Mueller observed, “It didn’t go well. It caused massive chaos,

with   forty-four      production          incidents       filed    by    our     customers.       The

major reaction from management was basically ‘Let’s not ever do that

again.’”

Mueller took over the release processes shortly afterward, with

the    goal    of   doing     biweekly          releases      without      causing       customer

downtime.       The    business          objectives     for    releasing       more    frequently

included enabling faster A/B testing (described in upcoming chapters)

and increasing the flow of features into production. Mueller identified

three core problems:

      - Lack of test automation made any level of testing during the

two-week        intervals         inadequate          to    prevent        large-scale

failures.

      - The version control branching strategy allowed developers

to check in new code right up to the production release.

      - The    teams    running          microservices         were       also    performing

independent          releases,      which       were       often     causing       issues

during the monolith release.

Mueller concluded that the monolithic Conversations application

deployment          process        needed       to    be     stabilized,         which      required

continuous      integration.        In   the    six   weeks       that   followed,    developers

stopped doing feature work to focus instead on writing automated

testing    suites,    including          unit   tests   in    JUnit,      regression        tests   in

Selenium, and ge            ing a deployment pipeline running in TeamCity. “By

running these tests all the time, we felt like we could make changes

with    some        level    of    safety.      And     most       importantly,        we        could

immediately     find   when      someone        broke   something,        as    opposed     to

18 discovering it only after it’s in production.”

They also changed to a trunk/branch release model, where every

two weeks they created a new dedicated release branch, with no new

commits allowed to that branch unless there was an emergency—all

changes   would      be   worked   through       a   sign-off    process,       either    per-

ticket or per-team through their internal wiki. That branch would go

through   a   QA      process,    which        would    then     be     promoted         into

production.   The     improvements        to   predictability     and     quality   of    the

releases were startling:

    - January      2012    release:      forty-four         customer          incidents

(continuous integration effort begins)

    - March 6, 2012 release: five days late, five customer incidents

    - March 22, 2012 release: on time, one customer incident

    - April 5, 2012 release: on time, zero customer incidents

Mueller further described how successful this effort was:

We had such success with releases every two weeks, we

went to weekly releases, which required almost no changes

from the engineering teams. Because releases became so

routine,   it   was   as    simple     as   doubling       the     number      of

releases on the calendar and releasing when the calendar

told us to.

Seriously, it was almost a non-event. The majority of

changes       required     were   in      our   customer          service    and

marketing teams, who had to change their processes, such

as changing the schedule of their weekly customer emails

to make sure customers knew that feature changes were

coming.

After that, we started working toward our next goals,

which eventually led to speeding up our testing times from

three plus hours to less than an hour, reducing the number

of environments from four to three (Dev, Test, Production,

eliminating      Staging),    and    moving       to   a   full    continuous

delivery   model    where    we    enable    fast,   one-click

deployments.

By systematically identifying and addressing three core problems, this case study illustrates the power of practices like feature freezes (in this case to work on automated testing) and using trunk-based development to enable small batch sizes and accelerate release cycles.

## Continuous Learning

Continuous integration makes it easy for teams to get fast feedback, and it contributes to continuous delivery and elite performance. Research shows this capability is important, with the 2014–2019 State of DevOps Reports backing up the stories shared in this chapter with data. Trunk-based development is likely the most controversial practice discussed in this book. However, data from DORA’s 2016 and 2017 State of DevOps Reports is clear: trunk-based development predicts higher throughput, better stability, and better availability if they follow these practices:21

     - have three or fewer active branches in the application’s

code repository

     - merge branches to trunk at least daily

     - don’t have code freezes or integration phases

The bene ts of continuous integration and trunk-based development extend beyond our ability to deliver software. DORA’s research shows that it contributes to higher job satisfaction and lower rates of burnout.22

Conclusion

In this chapter, we discussed the automation capabilities and behavioral practices that will allow us to ship our “done” code quickly and often. We have created the cultural norm of developing on trunk and checking in code at least once a day. These practices and norms allow us to scale, accepting code from several or hundreds of developers. We will be able to ship code at any time, without painful code freezes or integration phases. While convincing developers may be difficult at rst, once they see the extraordinary bene ts, they will likely become lifetime converts, as the HP LaserJet and Bazaarvoice examples illustrate. Continuous integration practices set the stage for the next step, which is automating the deployment process and enabling low-risk releases.

* Branching in version control has been used in many ways, but is typically used to divide work

between team members by release, promotion, task, component, technology platforms, and so forth. † Compile flags (#define and #ifdef) were used to enable/disable code execution for presence of copiers, paper size supported, and so on.5 ‡ The production release was delayed due to their (successful) IPO.


---

<div align="center">

[« Previous Chapter](./20_chapter_10_enable_fast_and_reliable_automated_testing.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./22_chapter_12_automate_and_enable_low_risk_releases.md)

</div>
