---
title: "Chapter 14: Create Telemetry To Enable Seeing And Solving Problems"
chapter: 26
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 307
word_count: 6227
estimated_tokens: 10653
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./25_part_iv_introduction.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./27_chapter_15_analyze_telemetry_to_better_anticipate_problems.md)

</div>

---

Afact of life in Operations is that things go wrong—small changes may result in many unexpected outcomes, including outages and global failures that impact all our customers. This is the reality of operating complex systems; no single person can see the whole system and understand how all the pieces t together. When production outages and other problems occur in our daily work, we often don’t have the information we need to solve the problem. For example, during an outage we may not be able to determine whether the issue is due to a failure in our application (e.g., defect in the code), in our environment (e.g., a networking problem, server con guration problem), or something entirely external to us (e.g., a massive denial of service attack). In Operations, we may deal with this problem with the following rule of thumb: When something goes wrong in production, we just reboot the server. If that doesn’t work, reboot the server next to it. If that doesn’t work, reboot all the servers. If that doesn’t work, blame the developers; they’re always causing outages.1 In contrast, the Microsoft Operations Framework (MOF) study in 2001 found that organizations with the highest service levels rebooted their servers twenty times less frequently than average and had ve times fewer “blue screens of death.”2 In other words, they found that the bestperforming organizations were much better at diagnosing and xing service incidents, in what Kevin Behr, Gene Kim, and George Spafford called a “culture of causality” in The Visible Ops Handbook. High performers

used a disciplined approach to solving problems, using production telemetry to understand possible contributing factors to focus their problem solving, as opposed to lower performers who would blindly reboot servers.3 To enable this disciplined problem-solving behavior, we need to design our systems so that they are continually creating telemetry, widely de ned as “an automated communications process by which measurements and other data are collected at remote points and are subsequently transmitted to receiving equipment for monitoring.”4 Our goal is to create telemetry within our applications and environments, both in our production and pre-production environments as well as in our deployment pipeline.

DevOps Transformation at Etsy (2012)

Michael Rembetsy and Patrick McDonnell described how production monitoring was a critical part of Etsy’s DevOps transformation that started in 2009. This was because they were standardizing and transitioning their entire technology stack to the LAMP stack (Linux, Apache, MySQL, and PHP), abandoning myriad different technologies being used in production that were increasingly difficult to support. At the 2012 Velocity Conference, McDonnell described how much risk this created:

We were changing some of our most critical infrastructure, which, ideally, customers would never notice. However, they’d definitely notice if we screwed something up. We needed more metrics to give us confidence that we weren’t actually breaking things while we were doing these big changes, both for our engineering teams and for team members in the nontechnical areas, such as marketing.5

McDonnell explained further,

We started collecting all our server information in a tool called Ganglia, displaying all the information into Graphite, an open-source tool we invested heavily into. We started aggregating metrics together, everything from business metrics to deployments. This is

when we modified Graphite with what we called “our unparalleled and unmatched vertical line technology” that overlaid onto every metric graph when deployments happened. By doing this, we could more quickly see any unintended deployment side effects. We even started putting TV screens all around the office so that everyone could see how our services were performing.6

By enabling developers to add telemetry to their features as part of their daily work, Etsy created enough telemetry to help make deployments safe. By 2011, Etsy was tracking over two hundred thousand production metrics at every layer of the application stack (e.g., application features, application health, database, operating system, storage, networking, security, etc.) with the top thirty most important business metrics prominently displayed on their “deploy dashboard.” By 2014, they were tracking over eight hundred thousand metrics, showing their relentless goal of instrumenting everything and making it easy for engineers to do so.7 As Ian Malpass, an engineer at Etsy, quipped,

If Engineering at Etsy has a religion, it’s the Church of Graphs. If it moves, we track it. Sometimes we’ll draw a graph of something that isn’t moving yet, just in case it decides to make a run for it. . . . Tracking everything is key to moving fast, but the only way to do it is to make tracking anything easy. . . . We enable engineers to track what they need to track, at the drop of a hat, without requiring timesucking configuration changes or complicated processes.8

In the 2015 State of DevOps Report, high performers resolved production incidents 168 times faster than their peers, with the median performer having an MTTR measured in minutes, while the low performer had an MTTR measured in days.9 In DORA’s 2019 State of DevOps Report, elite performers resolved production incidents 2,604 times faster than their low-performing peers, with the median elite performer having a MTTR measured in minutes, while the median low performer had an MTTR measured in weeks.10

As was created at Etsy, our goal in this chapter is to ensure that we always have enough telemetry so that we can con rm that our services are correctly operating in production. And when problems do occur, our goal is to make it possible to quickly determine what is going wrong and make informed decisions on how best to x it, ideally long before customers are impacted. Furthermore, telemetry helps us assemble our best understanding of reality and detect when our understanding of reality is incorrect.

Create Our Centralized Telemetry Infrastructure

Operational monitoring and logging is by no means new—multiple generations of Operations engineers have used and customized monitoring frameworks (e.g., HP OpenView, IBM Tivoli, and BMC Patrol/BladeLogic) to ensure the health of production systems. Data was typically collected through agents that ran on servers or through agentless monitoring (e.g., SNMP traps or polling-based monitors). There was often a graphical user interface (GUI) front end, and back-end reporting was often augmented through tools such as Crystal Reports.

Performers (2019) Source: Forsgren et al., Accelerate: State of DevOps (2019).

Similarly, the practices of developing applications with effective logging and managing the resulting telemetry are not new—a variety of mature logging libraries exist for almost all programming languages. However, for decades we have ended up with silos of information, where Development only creates logging events that are interesting to developers, and Operations only monitors whether the environments are up or down. As a result, when inopportune events occur, no one can determine why the entire system is not operating as designed or which speci c component is failing, impeding our ability to bring our system back to a working state. In order for us to see all problems as they occur, we must design and develop our applications and environments so that they generate sufficient telemetry, allowing us to understand how our system is behaving as a whole. When all levels of our application stack have monitoring and logging, we enable other important capabilities, such as graphing and visualizing our metrics, anomaly detection, proactive alerting and escalation, etc.

In The Art of Monitoring, James Turnbull describes a modern monitoring architecture, which has been developed and used by Operations engineers at web-scale companies (e.g., Google, Amazon, Facebook). The architecture often consisted of open-source tools, such as Nagios and Zenoss, that were customized and deployed at a scale that was difficult to accomplish with licensed commercial software at the time.11 This architecture has the following components:

  - Data collection at the business logic, application, and

environments layer: In each of these layers, we are creating telemetry in the form of events, logs, and metrics. Logs may be stored in application-speci c        les on each server (e.g., /var/log/httpd-error.log), but preferably we want all our logs sent to a common service that enables easy centralization, rotation, and deletion. This is provided by most operating systems, such as syslog for Linux, the Event Log for Windows, etc. Furthermore, we gather metrics at all layers of the application stack to better understand how our system is behaving. At the operating system level, we can collect metrics such as CPU, memory, disk, or network usage over time using tools like collected, Ganglia, etc. The Cloud Native Computing Foundation has created an open standard for metrics and tracking data called OpenTelemetry, which is understood by many open-source and commercial tools. Other tools that collect performance information include Apache Skywalking, AppDynamics, and New Relic.

  - An event router responsible for storing our events and metrics:

This capability potentially enables visualization, trending, alerting, anomaly detection, and so forth. By collecting, storing, and aggregating all our telemetry, we better enable further analysis and health checks. This is also where we store con gurations related to our services (and their supporting applications and environments) and is likely where we do threshold-based alerting and health checks. Examples of tools in this space include Prometheus, Honeycomb, DataDog, and Sensu.

Once we have centralized our logs, we can transform them into metrics by counting them in the event router—for example, a log event such as “child pid 14024 exit signal Segmentation fault” can be counted and summarized as a single segfault metric across our entire production infrastructure. By transforming logs into metrics, we can now perform statistical operations on them, such as using anomaly detection to nd outliers and variances even earlier in the problem cycle. For instance, we might con gure our alerting to notify us if we went from “ten segfaults last week” to “thousands of segfaults in the last hour,” prompting us to investigate further. In addition to collecting telemetry from our production services and environments, we must also collect telemetry from our deployment pipeline when important events occur, such as when our automated tests pass or fail and when we perform deployments to any environment. We should also collect telemetry on how long it takes us to execute our builds and tests. By doing this, we can detect conditions that could indicate problems, such as if the performance test or our build takes twice as long as normal, allowing us to nd and x errors before they go into production. Furthermore, we should ensure that it is easy to enter and retrieve information from our telemetry infrastructure. Preferably, everything should be done through self-service APIs, as opposed to requiring people to open up tickets and wait to get reports.

Source: Turnbull, The Art of Monitoring, Kindle edition, chap. 2.

Ideally, we will create telemetry that tells us exactly when anything of interest happens, as well as where and how. Our telemetry should also be suitable for manual and automated analysis and should be able to be analyzed without having the application that produced the logs on hand.* As Adrian Cockcroft pointed out, “Monitoring is so important that our monitoring systems need to be more available and scalable than the systems being monitored.”12

Create Application Logging Telemetry That Helps Production

Now that we have a centralized telemetry infrastructure, we must ensure that the applications we build and operate are creating sufficient telemetry. We do this by having Dev and Ops engineers create production telemetry as part of their daily work, both for new and existing services.

Scott Prugh, CTO at CSG, said,

Every time NASA launches a rocket, it has millions of automated sensors reporting the status of every component of this valuable asset. And yet, we often don’t take the same care with software—we found that creating application and infrastructure telemetry to be one of the highest return investments we’ve made. In 2014, we created over one billion telemetry events per day, with over one hundred thousand code locations instrumented.13

In the applications we create and operate, every feature should be instrumented. If it was important enough for an engineer to implement, then it is important enough to generate enough production telemetry to con rm that it is operating as designed and that the desired outcomes are being achieved.† Every member of our value stream will use telemetry in a variety of ways. For example, developers may temporarily create more telemetry in their application to better diagnose problems on their workstation, while Ops engineers may use telemetry to diagnose a production problem. In addition, Infosec and auditors may review the telemetry to con rm the effectiveness of a required control, and a product manager may use them to track business outcomes, feature usage, or conversion rates. To support these various usage models, we have different logging levels, some of which may also trigger alerts, such as the following:14

  - DEBUG level: Information at this level is about anything that

happens in the program, most often used during debugging. Often, debug logs are disabled in production but temporarily enabled during troubleshooting.

  - INFO level: Information at this level consists of actions that are

user-driven or system speci c (e.g., “beginning credit card transaction”).

  - WARN level: Information at this level tells us of conditions that

could potentially become an error (e.g., a database call taking longer than some prede ned time). These will likely initiate an

alert and troubleshooting, while other logging messages may help us better understand what led to this condition.

  - ERROR level: Information at this level focuses on error conditions

(e.g., API call failures, internal error conditions).

  - FATAL level: Information at this level tells us when we must

terminate (e.g., a network daemon can’t bind a network socket).

Choosing the right logging level is important. Dan North, a former ThoughtWorks consultant who was involved in several projects in which the core continuous delivery concepts took shape, observes, “When deciding whether a message should be ERROR or WARN, imagine being woken up at 4 AM. Low printer toner is not an ERROR.”15 To help ensure that we have information relevant to the reliable and secure operations of our service, we should ensure that all potentially signi cant application events generate logging entries, including those provided on this list assembled by Anton A. Chuvakin, a research VP at Gartner’s GTP Security and Risk Management group:16

  - authentication/authorization decisions (including logoff)

  - system and data access

  - system and application changes (especially privileged changes)

  - data changes, such as adding, editing, or deleting data

  - invalid input (possible malicious injection, threats, etc.)

  - resources (RAM, disk, CPU, bandwidth, or any other resource that

has hard or soft limits)

  - health and availability

  - startups and shutdowns

  - faults and errors

  - circuit breaker trips

  - delays

  - backup success/failure

To make it easier to interpret and give meaning to all these log entries, we should (ideally) create logging hierarchical categories, such as for nonfunctional attributes (e.g., performance, security) and for attributes related to features (e.g., search, ranking).

Use Telemetry to Guide Problem Solving

As described in the beginning of this chapter, high performers use a disciplined approach to solving problems. This is in contrast to the more common practice of using rumor and hearsay, which can lead to the unfortunate metric of mean time until declared innocent—how quickly can we convince everyone else that we didn’t cause the outage. When there is a culture of blame around outages and problems, groups may avoid documenting changes and displaying telemetry where everyone can see them to avoid being blamed for outages. Other negative outcomes due to lack of public telemetry include a highly charged political atmosphere, the need to de ect accusations, and, worse, the inability to create institutional knowledge around how the incidents occurred and the learnings needed to prevent these errors from happening again in the future.‡ In contrast, telemetry enables us to use the scienti c method to formulate hypotheses about what is causing a particular problem and what is required to solve it. Examples of questions we can answer during problem resolution include:

  - What evidence do we have from our monitoring that a problem is

actually occurring?

  - What are the relevant events and changes in our applications and

environments that could have contributed to the problem?

  - What hypotheses can we formulate to con rm the link between the

proposed causes and effects?

  - How can we prove which of these hypotheses are correct and

successfully affect a x?

The value of fact-based problem-solving lies not only in signi cantly faster MTTR (and better customer outcomes), but also in its reinforcement of the perception of a win/win relationship between Development and Operations.

Enable Creation of Production Metrics as Part of Daily Work

To enable everyone to be able to nd and x problems in their daily work, we need to enable everyone to create metrics in their daily work that can be easily created, displayed, and analyzed. To do this, we must create the infrastructure and libraries necessary to make it as easy as possible for anyone in Development or Operations to create telemetry for any functionality they build. In the ideal, it should be as easy as writing one line of code to create a new metric that shows up in a common dashboard where everyone in the value stream can see it. This was the philosophy that guided the development of one of the most widely used metrics libraries, called StatsD, which was created and open-sourced at Etsy.18 As John Allspaw described, “We designed StatsD to prevent any developer from saying, ‘It’s too much of a hassle to instrument my code.’ Now they can do it with one line of code. It was important to us that for a developer, adding production telemetry didn’t feel as difficult as doing a database schema change.”19 StatsD can generate timers and counters with one line of code (in Ruby, Perl, Python, Java, and other languages) and is often used in conjunction with Graphite or Grafana, which render metric events into graphs and dashboards.

user login event (in this case, one line of PHP code: “StatsD::increment(“login.successes”)). The resulting graph shows the number of successful and failed logins per minute, and overlaid on the graph are vertical lines that represent a production deployment.

Graphite at Etsy Source: Ian Malpass, “Measure Anything, Measure Everything.”

When we generate graphs of our telemetry, we will also overlay onto them when production changes occur, because we know that the signi cant majority of production issues are caused by production changes, which include code deployments. This is part of what allows us to have a high rate of change while still preserving a safe system of work. More recently, the emergence of the OpenTelemetry standard has provided a way for data collectors to communicate with metrics storage and processing systems. There are OpenTelemetry integrations with all major languages, frameworks, and libraries, and most popular metrics and observability tools accept OpenTelemetry data.§ By generating production telemetry as part of our daily work, we create an ever-improving capability to not only see problems as they occur but also to design our work so that problems in design and operations can be revealed, allowing an increasing number of metrics to be tracked, as we saw in the Etsy case study.

Create Self-Service Access to Telemetry and Information Radiators

In the previous steps, we enabled Development and Operations to create and improve production telemetry as part of their daily work. In this step, our goal is to radiate this information to the rest of the organization, ensuring that anyone who wants information about any of the services we are running can get it without needing production system access or privileged accounts, or having to open up a ticket and wait for days for someone to con gure the graph for them. By making telemetry fast, easy to get, and sufficiently centralized, everyone in the value stream can share a common view of reality. Typically, this means that production metrics will be radiated on web pages generated by a centralized server, such as Graphite or any of the other technologies described in the previous section. We want our production telemetry to be highly visible, which means putting it in central areas where Development and Operations work, thus allowing everyone who is interested to see how our services are performing. At a minimum, this includes everyone in our value stream, such as Development, Operations, Product Management, and Infosec. This is often referred to as an information radiator, de ned by the Agile Alliance as,

the generic term for any of a number of handwritten, drawn, printed, or electronic displays which a team places in a highly visible location, so that all team members as well as passers-by can see the latest information at a glance: count of automated tests, velocity, incident reports, continuous integration status, and so on. This idea originated as part of the Toyota Production System.20

By putting information radiators in highly visible places, we promote responsibility among team members, actively demonstrating the following values:

  - The team has nothing to hide from its visitors (customers,

stakeholders, etc.).

  - The team has nothing to hide from itself: it acknowledges and

confronts problems.

Now that we possess the infrastructure to create and radiate production telemetry to the entire organization, we may also choose to broadcast this information to our internal customers and even to our external customers. For example, we might do this by creating publicly viewable service status pages so that customers can learn how the services they depend upon are performing. Although there may be some resistance to providing this amount of transparency, Ernest Mueller describes the value of doing so:

One of the first actions I take when starting in an organization is to use information radiators to communicate issues and detail the changes we are making—this is usually extremely well-received by our business units, who were often left in the dark before. And for Development and Operations groups who must work together to deliver a service to others, we need that constant communication, information, and feedback.21

We may even extend this transparency further—instead of trying to keep customer-impacting problems a secret, we can broadcast this information to our external customers. This demonstrates that we value transparency, thereby helping to build and earn customers’ trust.¶ (See Appendix 10.)

## Case Study

Creating Self-Service Metrics at LinkedIn (2011)

As described in Part III, LinkedIn was created in 2003 to help users

connect “to your network for be         er job opportunities.” By November

2015,   LinkedIn   had   over   350   million   members   generating   tens   of

thousands of requests per second, resulting in millions of queries per

second on the LinkedIn back-end systems.

Prachi Gupta, Director of Engineering at LinkedIn, wrote in 2011

about the importance of production telemetry:

At LinkedIn, we emphasize making sure the site is up and

our members have access to complete site functionality at

all    times.    Fulfilling    this   commitment          requires   that    we

detect and respond to failures and bo                lenecks as they start

happening. That’s why we use these time-series graphs for

site   monitoring        to   detect   and   react   to   incidents   within

minutes. . . . This monitoring technique has proven to be a

great tool for engineers. It lets us move fast and buys us

time to detect, triage, and fix problems.

However,     in    2010,   even    though     there    was   an   incredibly      large

volume of telemetry being generated, it was extremely difficult for

engineers to get access to the data, let alone analyze it. Thus began

Eric Wong’s summer intern project at LinkedIn, which turned into the

production telemetry initiative that created InGraphs.

Wong wrote, “To get something as simple as CPU usage of all the

hosts running a particular service, you would need to file a ticket and

someone would spend 30 minutes pu                    ing [a report] together.”

At the time, LinkedIn was using Zenoss to collect metrics, but as

Wong explains, “Ge             ing data from Zenoss required digging through a

slow web interface, so I wrote some python scripts to help streamline

the process. While there was still manual intervention in se                       ing up

metric collection, I was able to cut down the time spent navigating

Zenoss’ interface.”

Over the course of the summer, he continued to add functionality

to InGraphs so that engineers could see exactly what they wanted to

see, adding the ability to make calculations across multiple datasets,

view   week-over-week            trending     to   compare    historical    performance,

and    even    define     custom      dashboards     to   pick    exactly   which   metrics

would be displayed on a single page.

In writing about the outcomes of adding functionality to InGraphs

and the value of this capability, Gupta notes, “The effectiveness of our

monitoring system was highlighted in an instant where our InGraphs

monitoring   functionality      tied   to   a   major   web-mail   provider   started

trending downwards and the provider realized they had a problem in

25 their system only after we reached out to them!”

What started off as a summer internship project is now one of the

most   visible   parts   of   LinkedIn      operations.   InGraphs    has   been   so

successful that the real-time graphs are featured prominently in the

company’s engineering offices where visitors can’t fail to see them.

Self-service metrics can empower problem-solving and decision-making at the individual and team level, and provide necessary transparency to build and earn customers’ trust.

Find and Fill Any Telemetry Gaps

We have now created the infrastructure necessary to quickly create production telemetry throughout our entire application stack and radiate it throughout our organization. In this section, we will identify any gaps in our telemetry that impede our ability to quickly detect and resolve incidents—this is especially relevant if Dev and Ops currently have little (or no) telemetry. We will use this data later to better anticipate problems, as well as to enable everyone to gather the information they need to make better decisions to achieve organizational goals. Achieving this requires that we create enough telemetry at all levels of the application stack for all our environments, as well as for the deployment pipelines that support them. We need metrics from the following levels:

  - Business level: Examples include the number of sales transactions,

revenue of sales transactions, user sign-ups, churn rate, A/B testing results, etc.

  - Application level: Examples include transaction times, user

response times, application faults, etc.

  - Infrastructure level (e.g., database, operating system,

networking, storage): Examples include web server traffic, CPU load, disk usage, etc.

  - Client software level (e.g., JavaScript on the client browser,

mobile application): Examples include application errors and crashes, user-measured transaction times, etc.

  - Deployment pipeline level: Examples include build pipeline status

(e.g., red or green for our various automated test suites), change deployment lead times, deployment frequencies, test environment promotions, and environment status.

By having telemetry coverage in all of these areas, we will be able to see the health of everything that our service relies upon, using data and facts instead of rumors, nger-pointing, blame, and so forth. Further, we better enable detection of security-relevant events by monitoring any application and infrastructure faults (e.g., abnormal program terminations, application errors and exceptions, and server and storage errors). Not only does this telemetry better inform Development and Operations when our services are crashing, but these errors are often indicators that a security vulnerability is being actively exploited. By detecting and correcting problems earlier, we can x them while they are small and easy to x with fewer customers impacted. Furthermore, after every production incident, we should identify any missing telemetry that could have enabled faster detection and recovery; or, better yet, we can identify these gaps during feature development in our peer review process.

Application and Business Metrics

At the application level, our goal is to ensure that we are generating telemetry not only around application health (e.g., memory usage, transaction counts, etc.) but also to measure to what extent we are achieving our organizational goals (e.g., number of new users, user login events, user session lengths, percent of users active, how often certain features are being used, and so forth).

For example, if we have a service that is supporting e-commerce, we want to ensure that we have telemetry around all of the user events that lead up to a successful transaction that generates revenue. We can then instrument all the user actions that are required for our desired customer outcomes. These metrics will vary according to different domains as well as organizational goals. For instance, for an e-commerce site, we may want to maximize the time spent on the site, increasing likelihood of a sale. However, for search engines, we may want to reduce the time spent on the site, since long sessions may indicate that users are having difficulty nding what they’re looking for. In general, business metrics will be part of a customer acquisition funnel, which is the theoretical steps a potential customer will take to make a purchase. For instance, in an e-commerce site, the measurable journey events include total time on site, product link clicks, shopping cart adds, and completed orders. Ed Blankenship, Senior Product Manager for Microsoft Visual Studio Team Services, describes it like this: “Often, feature teams will de ne their goals in an acquisition funnel, with the goal of their feature being used in every customer’s daily work. Sometimes they’re informally described as ‘tire kickers,’ ‘active users,’ ‘engaged users,’ and ‘deeply engaged users,’ with telemetry supporting each stage.”26 Our goal is to have every business metric be actionable—these top metrics should help inform how to change our product and be amenable to experimentation and A/B testing. When metrics aren’t actionable, they are likely vanity metrics that provide little useful information—these we want to store, but likely not display, let alone alert on. Ideally, anyone viewing our information radiators will be able to make sense of the information we are showing in the context of desired organizational outcomes, such as goals around revenue, user attainment, conversion rates, etc. We should de ne and link each metric to a business outcome metric at the earliest stages of feature de nition and development, and measure the outcomes after we deploy them in production. Furthermore, doing this helps product owners describe the business context of each feature for everyone in the value stream.

Further business context can be created by being aware of and visually displaying time periods relevant to high-level business planning and operations, such as high transaction periods associated with peak holiday selling seasons, end-of-quarter nancial close periods, or scheduled compliance audits. This information may be used as a reminder to avoid scheduling risky changes when availability is critical or avoid certain activities when audits are in progress. By radiating how customers interact with what we build in the context of our goals (see they can see whether the capabilities we are building are actually being used and to what extent they are achieving business goals. As a result, we reinforce the cultural expectations that instrumenting and analyzing customer usage is also a part of our daily work, so we better understand how our work contributes to our organizational goals.

Deployments Source: Mike Brittain, “Tracking Every Release,” CodeasCraft.com, December 8, 2010, https://codeascraft.com/2010/12/08/track-every-release/.

Infrastructure Metrics

Just as with application metrics, our goal for production and nonproduction infrastructure is to ensure that we are generating enough telemetry so that if a problem occurs in any environment, we can quickly determine whether infrastructure is a contributing cause of the problem. Furthermore, we must be able to pinpoint exactly what in the infrastructure is contributing to the problem (e.g., database, operating system, storage, networking, etc.). We want to make as much infrastructure telemetry visible as possible, across all the technology stakeholders, ideally organized by service or application. In other words, when something goes wrong with something in our environment, we need to know exactly what applications and services could be or are being affected.** In decades past, creating links between a service and the production infrastructure it depended on was often a manual effort (such as ITIL CMDBs or creating con guration de nitions inside alerting tools in tools such as Nagios). However, increasingly these links are now registered automatically within our services, which are then dynamically discovered and used in production through tools such as ZooKeeper, Etcd, Consul, Istio, etc.27 These tools enable services to register themselves, storing information that other services need to interact with it (e.g., IP address, port numbers, URIs). This solves the manual nature of the ITIL CMDB and is absolutely necessary when services are made up of hundreds (or thousands, or even millions) of nodes, each with dynamically assigned IP addresses.†† Regardless of how simple or complex our services are, graphing our business metrics alongside our application and infrastructure metrics allows us to detect when things go wrong. For instance, we may see that new customer sign-ups drop to 20% of daily norms, and then immediately also see that all our database queries are taking ve times longer than normal, enabling us to focus our problem solving. Furthermore, business metrics create context for our infrastructure metrics, enabling Development and Operations to better work together toward common goals. As Jody Mulkey, CTO of Ticketmaster/LiveNation,

observes, “Instead of measuring Operations against the amount of downtime, I nd it’s much better to measure both Dev and Ops against the real business consequences of downtime: how much revenue should we have attained, but didn’t.”29‡‡

## Continuous Learning

DORA’s 2019 State of DevOps Report found that infrastructure monitoring contributed to continuous delivery. This is because the visibility and fast feedback it provides to all stakeholders is key to help everyone see the outcomes of build, test, and deployment outcomes.30

Note that in addition to monitoring our production services, we also need telemetry for those services in our pre-production environments (e.g., development, test, staging, etc.). Doing this enables us to nd and x issues before they go into production, such as detecting when we have ever-increasing database insert times due to a missing table index.

Overlaying Other Relevant Information Onto Our Metrics

Even after we have created our deployment pipeline that allows us to make small and frequent production changes, changes still inherently create risk. Operational side effects are not just outages but also signi cant disruptions and deviations from standard operations. To make changes visible, we make work visible by overlaying all production deployment activities on our graphs. For instance, for a service that handles a large number of inbound transactions, production changes can result in a signi cant settling period, where performance degrades substantially as all cache lookups miss. To better understand and preserve quality of service, we want to understand how quickly performance returns to normal and, if necessary, take steps to improve performance. Similarly, we want to overlay other useful operational activities, such as when the service is under

maintenance or being backed up, in places where we may want to display or suppress alerts.

Conclusion

The improvements enabled by production telemetry from Etsy and LinkedIn show us how critical it is to see problems as they occur so we can search out the cause and quickly remedy the situation. By having all elements of our service emitting telemetry that can be analyzed whether it is in our application, database, or environment, and making that telemetry widely available, we can nd and x problems long before they cause something catastrophic, ideally long before a customer even notices that something is wrong. The result is not only happier customers, but, by reducing the amount of re ghting and crises when things go wrong, we have a happier and more productive workplace with less stress and lower levels of burnout.

* From here on, the term telemetry will be used interchangeably with metrics, which includes all

event logging and metrics created by our services at all levels of our application stack and generated from all our production and pre-production environments, as well as from our deployment pipeline. † A variety of application logging libraries exist that make it easy for developers to create useful telemetry, and we should choose one that allows us to send all our application logs to the centralized logging infrastructure that we created in the previous section. Popular examples include rrd4j and log4j for Java, and log4r and ruby-cabin for Ruby. ‡ In 2004, Gene Kim, Kevin Behr, and George Spafford described this as a symptom of lacking a “culture of causality,” noting that high-performing organizations recognize that 80% of all outages are caused by change and 80% of MTTR is spent trying to determine what changed.17 § A whole other set of tools to aid in monitoring, aggregation, and collection include Splunk, Zabbix, Sumo Logic, DataDog, as well as Nagios, Cacti, Sensu, RRDTool, Netflix Atlas, Riemann, and others. Analysts often call this broad category of tools “application performance monitors.” ¶ Creating a simple dashboard should be part of creating any new product or service—automated tests should confirm that both the service and dashboard are working correctly, helping both our customers and our ability to safely deploy code. ** Exactly as an ITIL configuration management database (CMDB) would prescribe. †† Consul may be of specific interest, as it creates an abstraction layer that easily enables service mapping, monitoring, locks, and key-value configuration stores, as well as host clustering and failure detection.28 ‡‡ This could be the cost of production downtime or the costs associated with a late feature. In product development terms, the second metric is known as cost of delay and is key to making

effective prioritization decisions.


---

<div align="center">

[« Previous Chapter](./25_part_iv_introduction.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./27_chapter_15_analyze_telemetry_to_better_anticipate_problems.md)

</div>
