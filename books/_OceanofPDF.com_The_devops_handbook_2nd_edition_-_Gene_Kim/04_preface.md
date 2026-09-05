---
title: "Preface"
chapter: 4
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 21
word_count: 2317
estimated_tokens: 3855
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./03_foreword_to_the_first_edition.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./05_introduction.md)

</div>

---

Aha!

The journey to complete The DevOps Handbook has been a long one—it started with weekly working Skype calls between the co-authors in February of 2011, with the vision of creating a prescriptive guide that would serve as a companion to the as-yet-un nished book The Phoenix Project: A Novel About IT, DevOps, and Helping Your Business Win. More than ve years later, with over two thousand hours of work, The DevOps Handbook is nally here. Completing this book has been an extremely long process, although one that has been highly rewarding and full of incredible learning, with a scope that is much broader than we originally envisioned. Throughout the project, all the co-authors shared a belief that DevOps is genuinely important, formed in a personal “aha” moment much earlier in each of our professional careers, which I suspect many of our readers will resonate with.

Gene Kim I’ve had the privilege of studying high-performing technology organizations since 1999, and one of the earliest findings was that boundary-spanning between the different functional groups of IT Operations, Information Security, and Development was critical to success. But I still remember the first time I saw the magnitude of the downward spiral that would result when these functions worked toward opposing goals.

It was 2006, and I had the opportunity to spend a week with the group that managed the outsourced IT Operations of a large airline reservation service. They described the downstream consequences of their large, annual software releases: each release would cause immense chaos and disruption for the outsourcer as well as customers; there would be SLA (service level agreement) penalties because of the customer-impacting outages; there would be layoffs of the most talented and experienced staff because of the resulting profit shortfalls; there would be much unplanned work and firefighting so that the remaining staff couldn’t work on the evergrowing service request backlogs coming from customers; the contract would be held together by the heroics of middle management; and everyone felt that the contract would be doomed to be put out for re-bid in three years. The sense of hopelessness and futility that resulted created, for me, the beginnings of a moral crusade. Development seemed to always be viewed as strategic, but IT Operations was viewed as tactical, often delegated away or outsourced entirely, only to return in five years in worse shape than it was first handed over. For many years, many of us knew that there must be a better way. I remember seeing the talks coming out of the 2009 Velocity Conference, describing amazing outcomes enabled by architecture, technical practices, and cultural norms that we now know as DevOps. I was so excited because it clearly pointed to the better way that we had all been searching for. And helping spread that word was one of my personal motivations to co-author The Phoenix Project. You can imagine how incredibly rewarding it was to see the broader community react to that book, describing how it helped them achieve their own “aha” moments.

Jez Humble My DevOps “aha” moment was at a startup in 2000—my first job after graduating. For some time, I was one of two technical staff. I did everything: networking, programming, support, systems

administration. We deployed software to production by FTP directly from our work-stations. Then in 2004 I got a job at ThoughtWorks, a consultancy where my first gig was working on a project involving about seventy people. I was on a team of eight engineers whose full-time job was to deploy our software into a production-like environment. In the beginning, it was really stressful. But over a few months, we went from manual deployments that took two weeks to an automated deployment that took one hour, where we could roll forward and back in milliseconds using the blue-green deployment pattern during normal business hours. That project inspired a lot of the ideas in both the Continuous Delivery book and this one. A lot of what drives me and others working in this space is the knowledge that, whatever your constraints, we can always do better, and the desire to help people on their journey.

Patrick Debois For me, it was a collection of moments. In 2007 I was working on a data center migration project with some Agile teams. I was jealous that they had such high productivity—able to get so much done in so little time. For my next assignment, I started experimenting with Kanban in Operations and saw how the dynamic of the team changed. Later, at the Agile Toronto 2008 conference, I presented my IEEE paper on this, but I felt it didn’t resonate widely in the Agile community. We started an Agile system administration group, but I overlooked the human side of things. After seeing the 2009 Velocity Conference presentation “10 Deploys per Day” by John Allspaw and Paul Hammond, I was convinced others were thinking in a similar way. So I decided to organize the first DevOpsDays, accidentally coining the term DevOps. The energy at the event was unique and contagious. When people started to thank me because it changed their life for the better, I

understood the impact. I haven’t stopped promoting DevOps since.

John Willis In 2008, I had just sold a consulting business that focused on largescale, legacy IT operations practices around configuration management and monitoring (Tivoli) when I first met Luke Kanies (the founder of Puppet Labs). Luke was giving a presentation on Puppet at an O’Reilly open-source conference on configuration management (CM). At first I was just hanging out at the back of the room, killing time and thinking, “What could this twenty-year-old tell me about configuration management?” After all, I had literally been working my entire life at some of the largest enterprises in the world, helping them architect CM and other operations management solutions. However, about five minutes into his session, I moved up to the first row and realized everything I had been doing for the last twenty years was wrong. Luke was describing what I now call secondgeneration CM. After his session, I had an opportunity to sit down and have coffee with him. I was totally sold on what we now call infrastructure as code. However, while we met for coffee, Luke started going even further, explaining his ideas. He started telling me he believed that Operations was going to have to start behaving like software developers. They were going to have to keep their configurations in source control and adopt CI/CD delivery patterns for their workflow. Being the old IT Operations person at the time, I think I replied to him with something like, “That idea is going to sink like Led Zeppelin with Ops folk.” (I was clearly wrong.) Then about a year later, in 2009, at another O’Reilly conference, Velocity, I saw Andrew Clay Shafer give a presentation on Agile infrastructure. In his presentation, Andrew showed this iconic picture of a wall between developers and Operations with a metaphorical depiction of work being thrown over the wall. He coined this “the wall of confusion.” The ideas he expressed in that presentation codified what Luke was trying to tell me a year earlier. That was the light bulb

for me. Later that year, I was the only American invited to the original DevOpsDays in Ghent. By the time that event was over, this thing we call DevOps was clearly in my blood.

DevOps Myths

Clearly, the co-authors of this book all came to a similar epiphany, even if they came there from very different directions. But there is now an overwhelming weight of evidence that the problems described above happen almost everywhere, and that the solutions associated with DevOps are nearly universally applicable. The goal of writing this book is to describe how to replicate the DevOps transformations we’ve been a part of or have observed, as well as dispel many of the myths of why DevOps won’t work in certain situations. Below are some of the most common myths we hear about DevOps.

Myth—DevOps Is Only for Startups: While DevOps practices have been pioneered by the web-scale, internet “unicorn” companies such as Google, Amazon, Net ix, and Etsy, each of these organizations has, at some point in their history, risked going out of business because of the problems associated with more traditional “horse” organizations: highly dangerous code releases that were prone to catastrophic failure, inability to release features fast enough to beat the competition, compliance concerns, an inability to scale, high levels of distrust between Development and Operations, and so forth. However, each of these organizations was able to transform their architecture, technical practices, and culture to create the amazing outcomes that we associate with DevOps. As Dr. Branden Williams, an information security executive, said, “Let there be no more talk of DevOps unicorns or horses but only thoroughbreds and horses heading to the glue factory.”1

Myth—DevOps Replaces Agile: DevOps principles and practices are compatible with Agile, with many observing that DevOps is a logical continuation of the Agile journey that started in 2001. Agile often serves

as an effective enabler of DevOps because of its focus on small teams continually delivering high-quality code to customers. Many DevOps practices emerge if we continue to manage our work beyond the goal of “potentially shippable code” at the end of each iteration, extending it to having our code always in a deployable state, with developers checking into trunk daily, and if we demonstrate our features in production-like environments.

Myth—DevOps Is Incompatible with ITIL: Many view DevOps as a backlash to ITIL or ITSM (IT Service Management), which was originally published in 1989. ITIL has broadly in uenced multiple generations of Ops practitioners, including one of the co-authors, and is an ever-evolving library of practices intended to codify the processes and practices that underpin world-class IT Operations, spanning service strategy, design, and support. DevOps practices can be made compatible with ITIL processes. To support the shorter lead times and higher deployment frequencies associated with DevOps, many areas of ITIL become fully automated, solving many problems associated with the con guration and release management processes (e.g., keeping the con guration management database and de nitive software libraries up to date). And because DevOps requires fast detection and recovery when service incidents occur, the ITIL disciplines of service design, incident, and problem management remain as relevant as ever.

Myth—DevOps Is Incompatible with Information Security and Compliance: The absence of traditional controls (e.g., segregation of duty, change approval processes, manual security reviews at the end of the project) may dismay information security and compliance professionals. However, that doesn’t mean that DevOps organizations don’t have effective controls. Instead of security and compliance activities only being performed at the end of the project, controls are integrated into every stage of daily work in the software development life cycle, resulting in better quality, security, and compliance outcomes.

Myth—DevOps Means Eliminating IT Operations, or “NoOps”: Many misinterpret DevOps as the complete elimination of the IT Operations function. However, this is rarely the case. While the nature of IT Operations work may change, it remains as important as ever. IT Operations collaborates far earlier in the software life cycle with Development, who continues to work with IT Operations long after the code has been deployed into production. Instead of IT Operations doing manual work that comes from work tickets, it enables developer productivity through APIs and self-serviced platforms that create environments, test and deploy code, monitor and display production telemetry, and so forth. By doing this, IT Operations becomes more like Development (as do QA and Infosec), engaged in product development, where the product is the platform that developers use to safely, quickly, and securely test, deploy, and run their IT services in production.

Myth—DevOps Is Just “Infrastructure as Code” or Automation: While many of the DevOps patterns shown in this book require automation, DevOps also requires cultural norms and an architecture that allows for the shared goals to be achieved throughout the IT value stream. This goes far beyond just automation. As Christopher Little, a technology executive and one of the earliest chroniclers of DevOps, wrote, “DevOps isn’t about automation, just as astronomy isn’t about telescopes.”2

Myth—DevOps Is Only for Open-Source Software: Although many DevOps success stories take place in organizations using software such as the LAMP stack (Linux, Apache, MySQL, PHP), achieving DevOps outcomes is independent of the technology being used. Successes have been achieved with applications written in Microsoft.NET, COBOL, and mainframe assembly code, as well as with SAP and even embedded systems (e.g., HP LaserJet rmware).

Spreading the Aha! Moment

Each of the authors has been inspired by the amazing innovations happening in the DevOps community and the outcomes they are creating,

including safe systems of work and enabling small teams to quickly and independently develop and validate code that can be safely deployed to customers. Given our belief that DevOps is a manifestation of creating dynamic, learning organizations that continually reinforce high trust cultural norms, it is inevitable that these organizations will continue to innovate and win in the marketplace. It is our sincere hope that The DevOps Handbook will serve as a valuable resource for many people in different ways:

  - a guide for planning and executing DevOps transformations

  - a set of case studies to research and learn from

  - a chronicle of the history of DevOps

  - a means to create a coalition that spans Product Owners,

Architecture, Development, QA, IT Operations, and Information Security to achieve common goals

  - a way to get the highest levels of leadership support for DevOps

initiatives, as well as a moral imperative to change the way we manage technology organizations to enable better effectiveness and efficiency, as well as enabling a happier and more humane work environment, helping everyone become lifelong learners—this not only helps everyone achieve their highest goals as human beings, but also helps their organizations win


---

<div align="center">

[« Previous Chapter](./03_foreword_to_the_first_edition.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./05_introduction.md)

</div>
