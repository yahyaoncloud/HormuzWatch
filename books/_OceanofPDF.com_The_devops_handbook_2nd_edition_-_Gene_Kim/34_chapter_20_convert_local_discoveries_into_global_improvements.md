---
title: "Chapter 20: Convert Local Discoveries Into Global Improvements"
chapter: 34
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 419
word_count: 4786
estimated_tokens: 8509
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./33_chapter_19_enable_and_inject_learning_into_daily.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./35_chapter_21_reserve_time_to_create_organizational_learning.md)

</div>

---

In the previous chapter, we discussed developing a safe learning culture by encouraging everyone to talk about mistakes and accidents through blameless post-mortems. We also explored nding and xing ever-weaker failure signals, as well as reinforcing and rewarding experimentation and risk-taking. Furthermore, we helped make our system of work more resilient by proactively scheduling and testing failure scenarios, making our systems safer by nding latent defects and xing them. In this chapter, we will create mechanisms that make it possible for new learnings and improvements discovered locally to be captured and shared globally throughout the entire organization, multiplying the effect of global knowledge and improvement. By doing this, we elevate the state of the practice of the entire organization so that everyone doing work bene ts from the cumulative experience of the organization.

Use Chat Rooms and Chat Bots to Automate and Capture

Organizational Knowledge

Many organizations have created chat rooms to facilitate fast communication within teams. Chat rooms can also be used to trigger automation. This technique was pioneered in the ChatOps journey at GitHub. The goal was to put automation tools into the middle of the conversation in their chat rooms, helping create transparency and documentation of their work. As Jesse Newland, a systems engineer at GitHub, describes, “Even

when you’re new to the team, you can look in the chat logs and see how everything is done. It’s as if you were pair-programming with them all the time.”1 They created Hubot, a software application that interacted with the Ops team in their chat rooms, where it could be instructed to perform actions merely by sending it a command (e.g., “@hubot deploy owl to production”). The results would also be sent back into the chat room.2 Having this work performed by automation in the chat room (as opposed to running automated scripts via command line) had numerous bene ts, including:

  - Everyone saw everything that was happening.

  - Engineers, on their rst day of work, could see what daily work

looked like and how it was performed.

  - People were more apt to ask for help when they saw others helping

each other.

  - Rapid organizational learning was enabled and accumulated.

Furthermore, beyond the above tested bene ts, chat rooms inherently record and make all communications public; in contrast, emails are private by default, and the information in them cannot easily be discovered or propagated within an organization. Integrating our automation into chat rooms helps document and share our observations and problem-solving as an inherent part of performing our work. This reinforces a culture of transparency and collaboration in everything we do.

Hubot at GitHub

This is also an extremely effective way of converting local learning to global knowledge. At GitHub, all the Operations staff worked remotely— in fact, no two engineers worked in the same city. As Mark Imbriaco, former VP of Operations at GitHub, recalls, “There was no physical watercooler at GitHub. The chat room was the water cooler.”3 GitHub enabled Hubot to trigger their automation technologies, including Puppet, Capistrano, Jenkins, resque (a Redis-backed library for

creating background jobs), and graphme (which generates graphs from Graphite).4 Actions performed through Hubot included checking the health of services, doing Puppet pushes or code deployments into production, and muting alerts as services went into maintenance mode. Actions that were performed multiple times, such as pulling up the smoke test logs when a deployment failed, taking production servers out of rotation, reverting to master for production front-end services, or even apologizing to the engineers who were on call, also became Hubot actions.5* Similarly, commits to the source code repository and the commands that trigger production deployments both emit messages to the chat room. Additionally, as changes move through the deployment pipeline, their status is posted in the chat room. A typical, quick chat room exchange might look like:

@sr: @jnewland, how do you get that list of big repos? disk_hogs or something? @jnewland: /disk-hogs

Newland observes that certain questions that were previously asked during the course of a project are rarely asked now.6 For example, engineers may ask each other, “How is that deploy going?” or “Are you deploying that or should I?” or “How does the load look?” Among all the bene ts that Newland describes, which include faster onboarding of newer engineers and making all engineers more productive, the result that he felt was most important was that Ops work became more humane as Ops engineers were enabled to discover problems and help each other quickly and easily.7 GitHub created an environment for collaborative local learning that could be transformed into learnings across the organization. Throughout the rest of this chapter, we will explore ways to create and accelerate the spread of new organizational learnings.

Automate Standardized Processes in Software for Reuse

All too often, we codify our standards and processes for architecture, testing, deployment, and infrastructure management in prose, storing them in Word documents that are uploaded somewhere. The problem is that engineers who are building new applications or environments often don’t know that these documents exist, or they don’t have the time to implement the documented standards. The result is they create their own tools and processes, with all the disappointing outcomes we’d expect: fragile, insecure, and unmaintainable applications and environments that are expensive to run, maintain, and evolve. Instead of putting our expertise into Word documents, we need to transform these documented standards and processes, which encompass the sum of our organizational learnings and knowledge, into an executable form that makes them easier to reuse.8 One of the best ways we can make this knowledge reusable is by putting it into a centralized source code repository, making the tool available for everyone to search and use. Justin Arbuckle was chief architect at GE Capital in 2013 when he said, “We needed to create a mechanism that would allow teams to easily comply with policy—national, regional, and industry regulations across dozens of regulatory frameworks, spanning thousands of applications running on tens of thousands of servers in tens of data centers.”9 The mechanism they created was called ArchOps, which “enabled our engineers to be builders, not bricklayers. By putting our design standards into automated blueprints that were able to be used easily by anyone, we achieved consistency as a byproduct.”10 By encoding our manual processes into code that is automated and executed, we enable the process to be widely adopted, providing value to anyone who uses them. Arbuckle concluded that “the actual compliance of an organization is in direct proportion to the degree to which its policies are expressed as code.”11 By making this automated process the easiest means to achieve the goal, we allow practices to be widely adopted—we may even consider turning them into shared services supported by the organization.

Create a Single, Shared Source Code Repository for Our Entire

Organization

A rm-wide, shared source code repository is one of the most powerful mechanisms used to integrate local discoveries across the entire organization. When we update anything in the source code repository (e.g., a shared library), it rapidly and automatically propagates to every other service that uses that library, and it is integrated through each team’s deployment pipeline. Google is one of the largest examples of using an organization-wide shared source code repository. By 2015, Google had a single shared source code repository with over one billion les and over two billion lines of code. This repository is used by every one of their twenty- ve thousand engineers and spans every Google property, including Google Search, Google Maps, Google Docs, Google Calendar, Gmail, and YouTube.12† One of the valuable results of this is that engineers can leverage the diverse expertise of everyone in the organization. Rachel Potvin, a Google engineering manager overseeing the Developer Infrastructure group, told Wired that every Google engineer can access “a wealth of libraries” because “almost everything has already been done.”14 Furthermore, as Eran Messeri, an engineer in the Google Developer Infrastructure group, explains, one of the advantages of using a single repository is that it allows users to easily access all of the code in its most up-to-date form, without the need for coordination.15 We put into our shared source code repository not only source code but also other artifacts that encode knowledge and learning, including:

  - con guration standards for our libraries, infrastructure, and

environments (Chef, Puppet, or Ansible scripts)

  - deployment tools

  - testing standards and tools, including security

  - deployment pipeline tools

  - monitoring and analysis tools

  - tutorials and standards

Encoding knowledge and sharing it through this repository is one of the most powerful mechanisms we have for propagating knowledge. As Randy Shoup describes,

the most powerful mechanism for preventing failures at Google is the single code repository. Whenever someone checks in anything into the repo, it results in a new build, which always uses the latest version of everything. Everything is built from source rather than dynamically linked at runtime—there is always a single version of a library that is the current one in use, which is what gets statically linked during the build process.16

Tom Limoncelli is the co-author of The Practice of Cloud System Administration: Designing and Operating Large Distributed Systems and a former site reliability engineer at Google. In his book, he states that the value of having a single repository for an entire organization is so powerful it is difficult to even explain.

You can write a tool exactly once and have it be usable for all projects. You have 100% accurate knowledge of who depends on a library; therefore, you can refactor it and be 100% sure of who will be affected and who needs to test for breakage. I could probably list one hundred more examples. I can’t express in words how much of a competitive advantage this is for Google.17

## Continuous Learning

Research shows that good code-related practices contribute to elite performance. Based on her expertise building systems and leading development teams at Google, Rachel Potvin was an advisor on DORA’s 2019 State of DevOps Report, which identi ed code maintainability as a key construct in helping teams to do continuous delivery successfully. This new construct, based on the bene ts that Potvin saw from the infrastructure available at Google, helps teams think about structuring their work and their code.18 According to the report,

Teams that manage code maintainability well have systems and tools that make it easy for developers to change code maintained by other teams, find examples in the codebase, reuse other people’s code, as well as add, upgrade, and migrate to new versions of dependencies without breaking their code. Having these systems and tools in place not only contributes to CD, but also helps decrease technical debt, which in turn improves productivity.19

At Google, every library (e.g., libc, OpenSSL, as well as internally developed libraries, such as Java threading libraries) has an owner who is responsible for ensuring that the library not only compiles but also successfully passes the tests for all projects that depend upon it, much like a real-world librarian. That owner is also responsible for migrating each project from one version to the next. Consider the real-life example of an organization that runs eighty-one different versions of the Java Struts framework library in production—all but one of those versions have critical security vulnerabilities, and maintaining all those versions, each with its own quirks and idiosyncrasies, creates signi cant operational burden and stress.

Furthermore, all this variance makes upgrading versions risky and unsafe, which in turn discourages developers from upgrading. And the cycle continues. The single source repository solves much of this problem, as well as having automated tests that allow teams to migrate to new versions safely and con dently. If we are not able to build everything off a single source tree, then we must nd another means to maintain known good versions of the libraries and their dependencies. For instance, we may have an organization-wide repository such as Nexus, Artifactory, or a Debian or RPM repository, which we must then update when there are known vulnerabilities, both in these repositories and in production systems. It is essential to ensure that dependencies are drawn only from within the organization’s source control repository or package repository in order to prevent attacks through this “sofware supply chain” from compromising an organization’s systems.

Spread Knowledge by Using Automated Tests as Documentation

and Communities of Practice

When we have shared libraries being used across the organization, we should enable rapid propagation of expertise and improvements. Ensuring that each of these libraries has signi cant amounts of automated testing included means these libraries become self-documenting and show other engineers how to use them. This bene t will be nearly automatic if we have test-driven development (TDD) practices in place, where automated tests are written before we write the code. This discipline turns our test suites into a living, up-to-date speci cation of the system. Any engineer wishing to understand how to use the system can look at the test suite to nd working examples of how to use the system’s API. Ideally, each library will have a single owner or a single team supporting it, representing where knowledge and expertise for the library resides. Furthermore, we should (ideally) only allow one version to be used in production, ensuring that whatever is in production leverages the best collective knowledge of the organization.

In this model, the library owner is also responsible for safely migrating each group using the repository from one version to the next. This in turn requires quick detection of regression errors through comprehensive automated testing and continuous integration for all systems that use the library. In order to more rapidly propagate knowledge, we can also create discussion groups or chat rooms for each library or service, so anyone who has questions can get responses from other users, who are often faster to respond than the developers. By using this type of communication tool instead of having isolated pockets of expertise spread throughout the organization, we facilitate an exchange of knowledge and experience, ensuring that workers are able to help each other with problems and new patterns.

Design for Operations through Codified Non-Functional

Requirements

When Development follows their work downstream and participates in production incident resolution activities, the application becomes increasingly better designed for Operations. Furthermore, as we start to deliberately design our code and application so that it can accommodate fast ow and deployability, we will likely identify a set of non-functional requirements that we will want to integrate into all of our production services. Implementing these non-functional requirements will enable our services to be easy to deploy and keep running in production, where we can quickly detect and correct problems and ensure they degrade gracefully when components fail. Examples of non-functional requirements include ensuring that we have:

  - sufficient production telemetry in our applications                and

environments

  - the ability to accurately track dependencies

  - services that are resilient and degrade gracefully

  - forward and backward compatibility between versions

  - the ability to archive data to manage the size of the production

data set

  - the ability to easily search and understand log messages across

services

  - the ability to trace requests from users through multiple services

  - simple, centralized runtime con guration using feature ags, etc.

By codifying these types of non-functional requirements, we make it easier for all of our new and existing services to leverage the collective knowledge and experience of the organization. These are all responsibilities of the team building the service.

Build Reusable Operations User Stories into Development

When there is Operations work that cannot be fully automated or made self-service, our goal is to make this recurring work as repeatable and deterministic as possible. We do this by standardizing the needed work, automating as much as possible, and documenting our work so that we can best enable product teams to better plan and resource this activity. Instead of manually building servers and then putting them into production according to manual checklists, we should automate as much of this work as possible, including post-installation con guration management. Where certain steps cannot be automated (e.g., manually racking a server and having another team cable it), we should collectively de ne the handoffs as clearly as possible to reduce lead times and errors. This will also enable us to better plan and schedule these steps in the future. For instance, we can use tools such as Terraform to automate provisioning and con guration management of cloud infrastructure. Ad hoc changes or project work can be captured in work ticket systems such as JIRA or ServiceNow, with changes to infrastructure con guration captured in version control and linked to work tickets and then applied to our system automatically (a paradigm known as infrastructure-as-cod or GitOps). Ideally, for all our recurring Ops work, we will know the following: what work is required, who is needed to perform it, what the steps to

complete it are, and so forth. For instance, “We know a high-availability rollout takes fourteen steps, requiring work from four different teams, and the last ve times we performed this it took an average of three days.” Just as we create user stories in Development that we put into the backlog and then pull into work, we can create well-de ned “Ops user stories” that represent work activities that can be reused across all our projects (e.g., deployment, capacity, security, etc.). By creating these wellde ned Ops user stories, we expose repeatable IT Operations work in a manner where it shows up alongside Development work, enabling better planning and more repeatable outcomes.

Ensure Technology Choices Help Achieve Organizational Goals

When one of our goals is to maximize developer productivity, and we have service-oriented architectures, small service teams can potentially build and run their service in whatever language or framework best serves their speci c needs. In some cases, this is what best enables us to achieve our organizational goals. However, there are scenarios when the opposite occurs, such as when expertise for a critical service resides only in one team, and only that team can make changes or x problems, creating a bottleneck. In other words, we may have optimized for team productivity but inadvertently impeded the achievement of organizational goals. This often happens when we have a functionally oriented Operations group responsible for any aspect of service support. In these scenarios, to ensure that we enable the deep skill sets in speci c technologies, we want to make sure that Operations can in uence which components are used in production or give them the ability to not be responsible for unsupported platforms. If we do not have a list of technologies that Operations will support, collectively generated by Development and Operations, we should systematically go through the production infrastructure and services, as well as all their dependencies that are currently supported, to nd which ones are creating a disproportionate amount of failure demand and unplanned work. Our goal is to identify the technologies that:

  - impede or slow down the ow of work

  - disproportionately create high levels of unplanned work

  - disproportionately create large numbers of support requests

  - are most inconsistent with our desired architectural outcomes (e.g.,

throughput, stability, security, reliability, business continuity)

By removing these problematic infrastructures and platforms from the technologies supported by Ops, we enable everyone to focus on infrastructure that best helps achieve the global goals of the organization.

## Continuous Learning

The goal is to create infrastructure platforms where users (including development teams) can self-service the operations they need without having to raise tickets or send emails. This is a key capability enabled by modern cloud infrastructure—it is even one of the ve essential characteristics of cloud computing de ned by the US Federal Government’s National Institute of Standards and Technology (NIST):20

     - On-demand         self    service:    Consumers      can

automatically provision computing resources as needed, without human interaction from the provider.

     - Broad network access: Capabilities can be accessed

through heterogeneous platforms, such as mobile phones, tablets, laptops, and workstations.

     - Resource pooling: Provider resources are pooled in a

multi-tenant model, with physical and virtual resources dynamically assigned on demand. The customer may specify location at a higher level of abstraction, such as country, state, or data center.

     - Rapid elasticity: Capabilities can be elastically

provisioned and released to rapidly scale outward or inward on demand, appearing to be unlimited and able to be appropriated in any quantity at any time.

     - Measured service: cloud systems automatically

control, optimize, and report resource use based on the type of service, such as storage, processing, bandwidth, and active user accounts.

It’s possible to achieve success in building infrastructure platforms with private, public, and hybrid models— provided you also modernize your traditional datac enter operations’ practices and processes so you can meet these ve essential characteristics. If your technology platforms

don’t support these characteristics, it should be a priority to replace them with ones that do or modernize your existing platform to achieve these architectural outcomes as much as possible. DORA’s 2019 State of DevOps Report found that only 29% of respondents who said they were using cloud infrastructure agreed or strongly agreed that they met all ve of the characteristics of essential cloud computing as de ned by the NIST. And leveraging all ve characteristics of cloud computing mattered; elite performers were twentyfour times more likely to have met all essential cloud characteristics when compared to low performers.21 This demonstrates two things: First, the apparent disconnect between teams who may say they are in the cloud but may not reap the bene ts—it takes executing on the characteristics described above to be successful. Second, the impact of technical and architectural capabilities on software delivery performance. By executing well, elite teams saw signi cant performance in speed and stability compared to their low-performing peers.

## Case Study

Standardizing a New Technology Stack at Etsy (2010)

In many organizations’ adopting DevOps, a common story developers

tell is, “Ops wouldn’t provide us what we needed, so we just built and

supported   it   ourselves.”   However,    in   the   early   stages   of   the   Etsy

transformation, technology leadership took the opposite approach,

significantly     reducing   the   number    of   supported      technologies        in

production.

In 2010, after a nearly disastrous peak holiday season, the Etsy

team decided to massively reduce the number of technologies used in

production, choosing a few that the entire organization could fully

‡ support and eradicating the rest.

Their   goal   was    to   standardize           and    very     deliberately     reduce   the

supported        infrastructure         and       configurations.            One    of     the    early

decisions was to migrate Etsy’s entire platform to PHP and MySQL.

This     was     primarily        a    philosophical               decision      rather    than     a

technological decision—they wanted both Dev and Ops to be able to

understand          the    full   technology            stack      so    that    everyone       could

contribute to a single platform, as well as enable everyone to be able

to read, rewrite, and fix each other’s code.

Over the next several years, as Michael Rembetsy, who was Etsy’s

Director of Operations at the time, recalls, “We retired some great

technologies,         taking      them      entirely         out   of   production,”      including

ligh    pd, Postgres, MongoDB, Scala, CoffeeScript, Python, and many

others.

Similarly,    Dan   McKinley,         a   developer         on    the   feature   team     that

introduced MongoDB into Etsy in 2010, writes on his blog that all the

benefits of having a schema-less database were negated by all the

operational problems the team had to solve. These included problems

concerning logging, graphing, monitoring, production telemetry, and

backups        and    restoration,      as       well    as   numerous         other    issues    that

developers      typically      do     not   need        to   concern     themselves       with.   The

result was to abandon MongoDB, porting the new service to use the

already supported MySQL database infrastructure.

This case study from Etsy shows that, by removing problematic infrastructure and platforms, an organization can shift its focus to architectures that best align with and help achieve their goals.

## Case Study: New To The Second

EDITION

Crowdsourcing Technology Governance at Target (2018)

One of the key findings from the                            State of DevOps Report           s has been

that teams move faster when we don’t control how they work and

25 operate     or    what        technologies         they      use.        In   the   past,   technology

selection was an enforcement mechanism to limit variability in the

enterprise.           This    led   to   perceived           compliance          in    conforming        to

architecture, security, and business architecture needs. The tollgates,

centralized approvals, and silos resulted in less automation, limited

automation, and continued the “process & tool first” ideology ahead

of results and outcomes.

But   in    2015,       Target     began         a   new     program:         recommend_tech,

which    uses         crowdsourcing           to   make          technology      choices.     It   started

with a basic template on a single page layout for all technologies by

domain, providing a scope (local versus enterprise) and a half-life that

Target’s internal experts felt was applicable to a specific disposition.

During their 2018 DevOps Enterprise Summit presentation, Dan

Cundiff, Principal Engineer, Levi Geinert, Director of Engineering, and

Lucas Re      if, Principal Product Owner, explained how they wanted to

move faster by shifting from governance to guidance when it came to

technologies: libraries, frameworks, tools, etc. This guidance would

provide guardrails that teams could feel comfortable operating within

while also removing the friction of a strict governance process.

They found that the key to providing guidance versus governance

was    that      it    needed       to   be    accessible          (everyone          can   contribute),

transparent (everyone should be able to see), flexible (easy to change),

and    cultural         (community-driven)                  in    the      simplest    way     possible.

Ultimately,       guidance          should     be      there      to     empower       engineers,       not

constrain them.

Previously Target had in place what they called an architectural

§ review board (ARB),                a centralized group that met on a regular basis to

make tool decisions for all product teams. This was neither efficient

nor effective.

To improve, Dan Cundiff and his colleague Jason Walker created a

repo   in   GitHub           that   featured       a   simple       list   of   technology         choices:

collaboration tools, application frameworks, caching, datastores, etc.

They named it recommended_tech. Each technology is listed as either

recommended limited use ,                 ,   or   do not use  .    Each      file   shows     why     that

technology is recommended or not, how you can use it, etc. Plus, the

full history showing how the decision was made is available in the

repo.      The     context      of   the      decisions—and          most      importantly,       the

tracking    of     discussions—provided                more        “why”       answers      to    the

engineering        community.            As   mentioned       above,      the    “half-life”     of   a

disposition was a directional waypoint for teams to understand the

possibility of a shift within a domain.

This    list   isn’t   handed         down    to    engineers        without      any    input.

Anybody at Target can open a pull request to any of the technology

categories and suggest a change, a new technology, etc. Everyone can

comment and discuss the various benefits or risks of that technology.

And when it gets merged, that’s it. The technology choice is strongly

recommended and loosely held until the next pa                           ern emerges.

As    changes        are    localized      and     easy    for   teams       to   adjust,     the

reversibility is easy and flexibility is high. For example, switching from

Python to Golan for a given product’s API is considered highly flexible

and easy to reverse. Changing a cloud provider or decommissioning a

data center, on the other hand, is rigid and has an extremely large

blast radius.

For    changes        with   a   “steep     cost,”   the       CIO   is    brought   into     the

process. Any engineer can then pitch their idea directly to the CIO and

a   group    of        senior    leaders.      Ultimately,         the   recommended_tech

approach is about empowering engineers at any level to be invested

in their work in the simplest way possible.

This simple solution shows how removing impediments and bo lenecks can empower teams while still making sure they operate within approved guardrails.

Conclusion

The techniques described in this chapter enable every new learning to be incorporated into the collective knowledge of the organization,

multiplying its effect. We do this by actively and widely communicating new knowledge, such as through chat rooms and through technology such as architecture as code, shared source code repositories, technology standardization, and so forth. By doing this, we elevate the state of the practice of not only Dev and Ops but also the entire organization, so everyone who performs work does so with the cumulative experience of the entire organization.

* Hubot often performed tasks by calling shell scripts, which could then be executed from the chat

room anywhere, including from an engineer’s phone. † The Chrome and Android projects reside in a separate source code repository, and certain algorithms that are kept secret, such as PageRank, are available only to certain teams.13 ‡ At that time, Etsy used PHP, lighttp, Postgres, MongoDB, Scala, CoffeeScript, Python, as well as many other platforms and languages.22 § The TEP-LARB described in The Unicorn Project is partially based on the ARB at Target.


---

<div align="center">

[« Previous Chapter](./33_chapter_19_enable_and_inject_learning_into_daily.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./35_chapter_21_reserve_time_to_create_organizational_learning.md)

</div>
