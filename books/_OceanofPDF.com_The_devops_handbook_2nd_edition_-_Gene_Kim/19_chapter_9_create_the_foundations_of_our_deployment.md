---
title: "Chapter 9: Create The Foundations Of Our Deployment Pipeline"
chapter: 19
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 203
word_count: 4261
estimated_tokens: 7403
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./18_part_iii_introduction.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./20_chapter_10_enable_fast_and_reliable_automated_testing.md)

</div>

---

In order to create fast and reliable ow from Dev to Ops, we must ensure that we always use production-like environments at every stage of the value stream. Furthermore, these environments must be created in an automated manner, ideally on demand from scripts and con guration information stored in version control and entirely self-serviced, without any manual work required from Operations. Our goal is to ensure that we can re-create the entire production environment based on what’s in version control.

The Enterprise Data Warehouse Story (2009)

All too often, the only time we discover how our applications perform in anything resembling a production-like environment is during production deployment—far too late to correct problems without the customer being adversely impacted. An illustrative example of the spectrum of problems that can be caused by inconsistently built applications and environments is the Enterprise Data Warehouse program led by Em Campbell-Pretty at a large Australian telecommunications company in 2009. Campbell-Pretty became the general manager and business sponsor for this $200 million program, inheriting responsibility for all the strategic objectives that relied upon this platform. In her presentation at the 2014 DevOps Enterprise Summit, CampbellPretty explained,

At the time, there were ten streams of work in progress, all using waterfall processes, and all ten streams were significantly behind schedule. Only one of the ten streams had successfully reached user acceptance testing [UAT] on schedule, and it took another six months for that stream to complete UAT, with the resulting capability falling well short of business expectations. This under performance was the main catalyst for the department’s Agile transformation.1

However, after using Agile for nearly a year, they experienced only small improvements, still falling short of their needed business outcomes. Campbell-Pretty held a program-wide retrospective and asked, “After re ecting on all our experiences over the last release, what are things we could do that would double our productivity?”2 Throughout the project, there was grumbling about the “lack of business engagement.” However, during the retrospective, “improve availability of environments” was at the top of the list.3 In hindsight, it was obvious—Development teams needed provisioned environments in order to begin work and were often waiting up to eight weeks. They created a new integration and build team that was responsible for “building quality into our processes, instead of trying to inspect quality after the fact.”4 It was initially composed of database administrators (DBAs) and automation specialists tasked with automating their environment creation process. The team quickly made a surprising discovery: only 50% of the source code in their development and test environments matched what was running in production.5 Campbell-Pretty observed, “Suddenly, we understood why we encountered so many defects each time we deployed our code into new environments. In each environment, we kept xing forward, but the changes we made were not being put back into version control.”6 The team carefully reverse-engineered all the changes that had been made to the different environments and put them all into version control. They also automated their environment creation process so they could repeatedly and correctly spin up environments. Campbell-Pretty described the results, noting that “the time it took to get a correct environment went from eight weeks to one day. This was one

of the key adjustments that allowed us to hit our objectives concerning our lead time, the cost to deliver, and the number of escaped defects that made it into production.”7 Campbell-Pretty’s story shows the variety of problems that can be traced back to inconsistently constructed environments and changes not being systematically put back into version control. Throughout the remainder of this chapter, we will discuss how to build the mechanisms that will enable us to create environments on demand, expand the use of version control to everyone in the value stream, make infrastructure easier to rebuild than to repair, and ensure that developers run their code in production-like environments along every stage of the software development life cycle.

Enable On-Demand Creation of Dev, Test, and Production

Environments

As seen in the enterprise data warehouse example above, one of the major contributing causes of chaotic, disruptive, and sometimes even catastrophic software releases is that the rst time we ever get to see how our application behaves in a production-like environment with realistic load and production data sets is during the release.* In many cases, development teams may have requested test environments in the early stages of the project. However, when there are long lead times required for Operations to deliver test environments, teams may not receive them soon enough to perform adequate testing. Worse, test environments are often miscon gured or are so different from our production environments that we still end up with large production problems despite having performed pre-deployment testing. In this step, we want developers to run production-like environments on their own workstations, created on demand and self-serviced. By doing this, developers can run and test their code in production-like environments as part of their daily work, providing early and constant feedback on the quality of their work.

Instead of merely documenting the speci cations of the production environment in a document or on a wiki page, we create a common build mechanism that creates all of our environments, such as for development, test, and production. By doing this, anyone can get production-like environments in minutes, without opening up a ticket, let alone having to wait weeks.† To do this requires de ning and automating the creation of our known, good environments, which are stable, secure, and in a risk-reduced state, embodying the collective knowledge of the organization. All our requirements are embedded, not in documents or as knowledge in someone’s head, but codi ed in our automated environment build process. Instead of Operations manually building and con guring the environment, we can use automation for any or all of the following:

  - copying a virtualized environment (e.g., a VMware image, running

a Vagrant script, booting an Amazon Machine Image le in EC2)

  - building an automated environment creation process that starts

from “bare metal” (e.g., PXE install from a baseline image)

  - using “infrastructure as code” con guration management tools

(e.g., Puppet, Chef, Ansible, Salt, CFEngine, etc.)

  - using automated operating system con guration tools (e.g., Solaris

Jumpstart, Red Hat Kickstart, Debian preseed)

  - assembling an environment from a set of virtual images or

containers (e.g., Docker, Kubernetes)

  - spinning up a new environment in a public cloud (e.g., Amazon

Web Services, Google App Engine, Microsoft Azure), private cloud (for example, using a stack based on Kubernetes), or other PaaS (platform as a service, such as OpenStack or Cloud Foundry, etc.)

Because we’ve carefully de ned all aspects of the environment ahead of time, we are not only able to create new environments quickly but also ensure that these environments will be stable, reliable, consistent, and secure. This bene ts everyone. Operations bene ts from this capability to create new environments quickly, because automation of the environment creation process enforces consistency and reduces tedious, error-prone manual work. Furthermore,

Development bene ts by being able to reproduce all the necessary parts of the production environment to build, run, and test their code on their workstations. By doing this, we enable developers to nd and x many problems, even at the earliest stages of the project, as opposed to during integration testing or, worse, in production. By providing developers an environment they fully control, we enable them to quickly reproduce, diagnose, and x defects, safely isolated from production services and other shared resources. They can also experiment with changes to the environments, as well as to the infrastructure code that creates it (e.g., con guration management scripts), further creating shared knowledge between Development and Operations.‡

Create Our Single Repository of Truth for the Entire System

In the previous step, we enabled the on-demand creation of the development, test, and production environments. Now we must ensure that all parts of our software system can be con gured and managed using a source of truth that is maintained in version control. For decades, comprehensive use of version control has increasingly become a mandatory practice of individual developers and development teams.§ A version control system records changes to les or sets of les stored within the system.9 This can be source code, assets, or other documents that may be part of a software development project. We make changes in groups called commits or revisions. Each revision, along with metadata such as who made the change and when, is stored within the system in one way or another, allowing us to commit, compare, merge, and restore past revisions. It also minimizes risks by establishing a way to revert objects in production to previous versions.¶ When developers put all their application source les and con gurations in version control, it becomes the single repository of truth that contains the precise intended state of the system. However, because delivering value to the customer requires both our code and the environments they run in, we need our environments in version control as well. In other words, version control is for everyone in our value stream, including QA, Operations, Infosec, as well as developers.

By putting all production artifacts into version control, our version control repository enables us to repeatedly and reliably reproduce all components of our working software system—this includes our applications and production environment, as well as all of our preproduction environments. To ensure that we can restore production service repeatedly and predictably (and, ideally, quickly) even when catastrophic events occur, we must check in the following assets to our shared version control repository:

  - all application code and dependencies (e.g., libraries, static content,

etc.)

  - any script used to create database schemas, application reference

data, etc.

  - all the environment creation tools and artifacts described in the

previous step (e.g., VMware or AMI images, Puppet, Chef, or Ansible scripts.)

  - any le used to create containers (e.g., Docker, Rocket, or

Kubernetes de nitions or composition les)

  - all supporting automated tests and any manual test scripts

  - any script that supports code packaging, deployment, database

migration, and environment provisioning

  - all project artifacts (e.g., requirements documentation, deployment

procedures, release notes, etc.)

  - all cloud con guration les (e.g., AWS Cloudformation templates,

Microsoft Azure Stack DSC les, OpenStack HEAT)

  - any other script or con guration information required to create

infrastructure that supports multiple services (e.g., enterprise service buses, database management systems, DNS zone les, con guration rules for rewalls, and other networking devices)**

We may have multiple repositories for different types of objects and services, where they are labeled and tagged alongside our source code. For instance, we may store large virtual machine images, ISO les, compiled binaries, and so forth in artifact repositories (e.g., Nexus, Artifactory). Alternatively, we may put them in blob stores (e.g., Amazon S3 buckets) or

put Docker images into Docker registries, and so forth. We will also create and store a cryptographic hash of these objects at build time and validate this hash at deploy time to ensure they haven’t been tampered with. It is not sufficient to merely be able to re-create any previous state of the production environment; we must also be able to re-create the entire pre-production and build processes as well. Consequently, we need to put into version control everything relied upon by our build processes, including our tools (e.g., compilers, testing tools) and the environments they depend upon.†† Research highlights the importance of version control. The 2014–2019 State of DevOps Reports led by co-author Dr. Nicole Forsgren show that the use of version control for all production artifacts was a higher predictor for software delivery performance, which in turn predicted organizational performance. These ndings underscore the critical role version control plays in the software development process. We now know when all application and environment changes are recorded in version control; it enables us to not only quickly see all changes that might have contributed to a problem but also provides the means to roll back to a previous known, running state, allowing us to more quickly recover from failures. But why does using version control for our environments predict software delivery and contribute to organizational performance better than using version control for our code? Because in almost all cases, there are orders of magnitude more con gurable settings in our environment than in our code. Consequently, it is the environment that needs to be in version control the most.‡‡ Version control also provides a means of communication for everyone working in the value stream—having Development, QA, Infosec, and Operations able to see each other’s changes helps reduce surprises, creates visibility into each other’s work, and helps build and reinforce trust. (See Appendix 7.) Of course, this means that all teams must use the same version control system.

Make Infrastructure Easier to Rebuild Than to Repair

When we can quickly rebuild and re-create our applications and environments on demand, we can also quickly rebuild them instead of repairing them when things go wrong. Although this is something that almost all large-scale web operations do (i.e., operations with more than one thousand servers), we should also adopt this practice even if we have only one server in production. Bill Baker, a distinguished engineer at Microsoft, said that we used to treat servers like pets: “You name them and when they get sick, you nurse them back to health. [Now] servers are [treated] like cattle. You number them and when they get sick, you shoot them.”11 By having repeatable environment creation systems, we are able to easily increase capacity by adding more servers into rotation (i.e., horizontal scaling). We also avoid the disaster that inevitably results when we must restore service after a catastrophic failure of irreproducible infrastructure, created through years of undocumented and manual production changes. To ensure consistency of our environments, whenever we make production changes (con guration changes, patching, upgrading, etc.), those changes need to be replicated everywhere in our production and preproduction environments, as well as in any newly created environments. Instead of manually logging into servers and making changes, we must make changes in a way that ensures all changes are replicated everywhere automatically and that all our changes are put into version control. Depending on the life cycle of the con guration in question, we can rely on our automated con guration systems to ensure consistency (e.g., Puppet, Chef, Ansible, Salt, Bosh, etc.), use a service mesh or con guration management service to propagate runtime con guration (Istio, AWS Systems Manager Parameter Store etc.), or we can create new virtual machines or containers from our automated build mechanism and deploy them into production, destroying the old ones or taking them out of rotation.§§ The latter pattern is what has become known as immutable infrastructure, where manual changes to the production environment are no longer allowed—the only way production changes can be made is to put

the changes into version control and re-create the code and environments from scratch.13 By doing this, no variance is able to creep into production. To prevent uncontrolled con guration variances, we may disable remote logins to production servers¶¶ or routinely kill and replace production instances,*** ensuring that manually applied production changes are removed. This action motivates everyone to put their changes in the correct way through version control. By applying such measures, we are systematically reducing the ways our infrastructure can drift from our known, good states (e.g., con guration drift, fragile artifacts, works of art, snow akes, and so forth). Also, we must keep our pre-production environments up to date. Speci cally, we need developers run on our most current environment. Developers will often want to keep running on older environments because they fear environment updates may break existing functionality. However, we want to update them frequently so we can nd problems at the earliest part of the life cycle,††† and research from GitHub in the 2020 State of Octoverse report shows that keeping your software current is the best way to secure your codebase.15

## Case Study: New To Second

EDITION

How a Hotel Company Ran $30B of Revenue in Containers (2020)

While at one of the largest hotel companies, Dwayne Holmes, then

Senior Director of DevSecOps and Enterprise Platforms, and his team

containerized all of the company’s revenue generating systems, which

collectively supports over $30 billion in annual revenue.

Originally,   Dwayne     came      from    the     financial    sector.    He   was

struggling to find more things to automate to increase productivity. At

a local meetup on Ruby of Rails, he stumbled onto containers. For

Dwayne,   containers   were    a    clear   solution   for   accelerating     business

value and increasing productivity.

Containers    satisfy   three   key   things:   they     abstract    infrastructure

(the dial-tone principal—you pick up the phone and it works without

needing      to      know   how       it   works),   specialization     (Operations         could

create containers that developers could use over and over and over

again), and automation (containers can be built over and over again

and everything will just work).

With his love of containers now fully embedded, Dwayne took a

chance by leaving his comfortable position to become a contractor

for one of the largest hotel companies who was ready to go all in on

containers.

With a small, cross-functional team made up of three developers

and three infrastructure professionals. Their goal was to talk about

evolution versus revolution to totally change the way the enterprise

worked.

There were lots of learnings along the way, as Dwayne outlines in

his 2020 DevOps Enterprise Summit presentation, but ultimately the

project was successful.

For    Dwayne       and     the       hotel   company,       containers    are   the    way.

They’re cloud portable. They’re scalable. Health checks are built in.

They could test for latency versus CPU, and certs are no longer in the

application or managed by developers. Additionally, they are now able

to   focus   on      circuit   breaking,      they   have   APM     built-in,     operate    zero

trust, and images are very small due to good container hygiene and

sidecars being used to enhance everything.

During       his   time    at    the   hotel    company,      Dwayne      and    his   team

supported       over     three   thousand          developers      across   multiple    service

providers.      In    2016,    microservices         and   containers       were   running     in

production. In 2017 $1 billion was processed in containers, 90% of

new    applications         were       in   containers,     and     they    had    Kubernetes

running in production. In 2018, they were one of the top five largest

production           Kubernetes       clusters      by   revenue.    And     by    2020,     they

performed thousands of builds and deployments per day and were

running Kubernetes in five cloud providers.

Containers have become a fast-growing method of making infrastructure easier to rebuild and reuse than to repair,

ultimately accelerating the delivery of business value and developer productivity.

Modify Our Definition of Development “Done” to Include Running

in Production-Like Environments

Now that our environments can be created on demand and everything is checked into version control, our goal is to ensure that these environments are being used in the daily work of Development. We need to verify that our application runs as expected in a production-like environment long before the end of the project or before our rst production deployment. Most modern software development methodologies prescribe short and iterative development intervals, as opposed to the big-bang approach (i.e., the waterfall model). In general, the longer the interval between deployment, the worse the outcomes. For example, in the Scrum methodology, a sprint is a time-boxed development interval (maximum one month but typically less) within which we are required to be done, widely de ned as when we have “working and potentially shippable code.” Our goal is to ensure that Development and QA are routinely integrating the code with production-like environments at increasingly frequent intervals throughout the project. We do this by expanding the de nition of “done” beyond just correct code functionality: at the end of each development interval, or more frequently, we have integrated, tested, working, and potentially shippable code, demonstrated in a productionlike environment. In other words, we will only accept development work as done when it can be successfully built, deployed, and con rmed that it runs as expected in a production-like environment, instead of merely when a developer believes it to be done. Ideally, it runs under a production-like load with a production-like dataset, long before the end of a sprint. This prevents situations where a feature is called done merely because a developer can run it successfully on their laptop but nowhere else. By having developers write, test, and run their own code in a production-like environment, the majority of the work to successfully

integrate our code and environments happens during our daily work, instead of at the end of the release. By the end of our rst interval, our application can be demonstrated to run correctly in a production-like environment, with the code and environment having been integrated together many times over, ideally with all the steps automated (no manual tinkering required). Better yet, by the end of the project, we will have successfully deployed and run our code in production-like environments hundreds or even thousands of times, giving us con dence that most of our production deployment problems have been found and xed. Ideally, we use the same tools, such as monitoring, logging, and deployment, in our pre-production environments as we do in production. By doing this, we have familiarity and experience that will help us smoothly deploy and run, as well as diagnose and x, our service when it is in production. By enabling Development and Operations to gain a shared mastery of how the code and environment interact, and practicing deployments early and often, we signi cantly reduce the deployment risks that are associated with production code releases. This also allows us to eliminate an entire class of operational and security defects and architectural problems that are usually caught too late in the project to x.

Conclusion

The fast ow of work from Development to Operations requires that anyone can get production-like environments on demand. By allowing developers to use production-like environments even at the earliest stages of a software project, we signi cantly reduce the risk of production problems later. This is one of many practices that demonstrate how Operations can make developers far more productive. We enforce the practice of developers running their code in production-like environments by incorporating it into the de nition of “done.” Furthermore, by putting all production artifacts into version control, we have a “single source of truth” that allows us to re-create the entire production environment in a quick, repeatable, and documented way, using the same development practices for Operations work as we do for

Development work. And by making production infrastructure easier to rebuild than to repair, we make resolving problems easier and faster, as well as making it easier to expand capacity. Having these practices in place sets the stage for enabling comprehensive test automation, which is explored in the next chapter.

*   In this context, environment is defined as everything in the application stack except for the

application, including the databases, operating systems, networking, virtualization, and all associated configurations. †   Most developers want to test their code, and they have often gone to extreme lengths to obtain test environments to do so. Developers have been known to reuse old test environments from previous projects (often years old) or ask someone who has a reputation of being able to find one —they just won’t ask where it came from because, invariably, someone somewhere is now missing a server. ‡   Ideally, we should be finding errors before integration testing, when it is too late in the testing cycle to create fast feedback for developers. If we are unable to do so, we likely have an architectural issue that needs to be addressed. Designing our systems for testability, to include the ability to discover most defects using a nonintegrated virtual environment on a development workstation, is a key part of creating an architecture that supports fast flow and feedback. §   The first version control system was likely UPDATE on the CDC6600 (1969). Later came SCCS (1972), CMS on VMS (1978), RCS (1982), and so forth.8 ¶  One may observe that version control fulfills some of the ITIL constructs of the Definitive Media Library (DML) and Configuration Management Database (CMDB), inventorying everything required to re-create the production environment. ** In future steps, we will also check into version control all the supporting infrastructure we build, such as the automated test suites and our continuous integration and deployment pipeline infrastructure. †† Anyone who has done a code migration for an ERP system (e.g., SAP, Oracle Financials, etc.) may recognize the following situation: When a code migration fails, it is rarely due to a coding error. Instead, it’s far more likely that the migration failed due to some difference in the environments, such as between Development and QA or QA and Production. ‡‡ At Netflix, the average age of Netflix AWS instance is twenty-four days, with 60% being less than one week old.10 §§ Or allow it only in emergencies, ensuring that a copy of the console log is automatically emailed to the operations team.12 ¶¶ The entire application stack and environment can be bundled into containers, which can enable unprecedented simplicity and speed across the entire deployment pipeline. *** Kelly Shortridge has written more about this in her book Security Chaos Engineering. ††† The term integration has many slightly different usages in Development and Operations. In Development, integration typically refers to code integration, which is the integration of multiple code branches into trunk in version control. In continuous delivery and DevOps, integration testing refers to the testing of the application in a production-like environment or integrated test environment.14


---

<div align="center">

[« Previous Chapter](./18_part_iii_introduction.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./20_chapter_10_enable_fast_and_reliable_automated_testing.md)

</div>
