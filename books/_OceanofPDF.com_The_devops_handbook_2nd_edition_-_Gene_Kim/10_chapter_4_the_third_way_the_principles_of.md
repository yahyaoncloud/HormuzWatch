---
title: "Chapter 4: The Third Way: The Principles Of Continual Learning And Experimentation"
chapter: 10
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 101
word_count: 3892
estimated_tokens: 6930
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./09_chapter_3_the_second_way_the_principles_of.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./11_part_i_conclusion.md)

</div>

---

While the First Way addresses work ow from left to right and the Second Way addresses the reciprocal fast and constant feedback from right to left, the Third Way focuses on creating a culture of continual learning and experimentation. These are the principles that enable constant creation of individual knowledge, which is then turned into team and organizational knowledge. In manufacturing operations with systemic quality and safety problems, work is typically rigidly de ned and enforced. For instance, in the GM Fremont plant described in the previous chapter, workers had little ability to integrate improvements and learnings into their daily work, with suggestions for improvement “apt to meet a brick wall of indifference.”1 In these environments, there is also often a culture of fear and low trust, where workers who make mistakes are punished, and those who make suggestions or point out problems are viewed as whistleblowers and troublemakers. When this occurs, leadership is actively suppressing, even punishing, learning and improvement, perpetuating quality and safety problems. In contrast, high-performing manufacturing operations require and actively promote learning—instead of work being rigidly de ned, the system of work is dynamic, with line workers performing experiments in their daily work to generate new improvements enabled by rigorous standardization of work procedures and documentation of the results.

In the technology value stream, our goal is to create a high-trust culture, reinforcing that we are all lifelong learners who must take smart risks in our daily work. By applying a scienti c approach to both process improvement and product development, we learn from our successes and failures, identifying which ideas don’t work and reinforcing those that do. Moreover, any local learnings are rapidly turned into global improvements, so that new techniques and practices that improve the technology value stream in one area can be used by the entire organization.

## Continuous Learning

Continual learning and experimentation do more than just improve the performance of our systems. These practices also create an inspiring, rewarding workplace where we are excited to work and collaborate with our peers. Research led by the State of DevOps Reports presents compelling      ndings. For example, employees from organizations that embrace practices from the Third Way are 2.2 times more likely to recommend their team or organization to friends and have higher job satisfaction and lower levels of burnout. Recent research from McKinsey also reports that culture—which includes psychological safety, collaboration, and practicing continuous improvement—is a key driver of developer velocity and organizational value.2

We reserve time for the improvement of daily work and time to further accelerate and ensure learning. We consistently introduce stress into our systems to force continual improvement. We even simulate and inject failures in our production services under controlled conditions to increase our resilience. By creating this continual and dynamic system of learning, we enable teams to rapidly and automatically adapt to an ever-changing environment, which ultimately helps us win in the marketplace.

Enabling Organizational Learning and a Safety Culture

When we work within a complex system, by de nition it is impossible for us to perfectly predict all the outcomes for any action we take. This is what contributes to unexpected, or even catastrophic, outcomes and accidents in our daily work, even when we take precautions and work carefully. When these accidents affect our customers, we seek to understand why they happened. The root cause is often deemed to be human error, and the all-too-common management response is to “name, blame, and shame” the person who caused the problem.* And, either subtly or explicitly, management hints that the person guilty of committing the error will be punished. They then create more processes and approvals to prevent the error from happening again. Dr. Sidney Dekker, who codi ed several key elements of safety culture and coined the term just culture, wrote, “Responses to incidents and accidents that are seen as unjust can impede safety investigations, promote fear rather than mindfulness in people who do safety-critical work, make organizations more bureaucratic rather than more careful, and cultivate professional secrecy, evasion, and self-protection.”3 These issues are especially problematic in the technology value stream —our work is almost always performed within a complex system, and how management chooses to react to failures and accidents leads to a culture of fear, which then makes it unlikely that problems and failure signals are ever reported. The result is that problems remain hidden until a catastrophe occurs. Dr. Ron Westrum was one of the rst to observe the importance of organizational culture on safety and performance. He observed that in healthcare organizations, the presence of “generative” cultures was one of the top predictors of patient safety.4 Dr. Westrum de ned three types of culture:5†

Pathological organizations are characterized by large amounts of fear and threat. People often hoard information, withhold it for political reasons, or distort it to make themselves look better. Failure is often hidden.

Bureaucratic organizations are characterized by rules and processes, often to help individual departments maintain their “turf.” Failure is processed through a system of judgment, resulting in either punishment or justice and mercy.

Generative organizations are characterized by actively seeking and sharing information to better enable the organization to achieve its mission. Responsibilities are shared throughout the value stream, and failure results in re ection and genuine inquiry.

Just as Dr. Westrum found in healthcare organizations, a high-trust, generative culture also predicted software delivery and organizational performance in technology value streams.6 In the technology value stream, we establish the foundations of a generative culture by striving to create a safe system of work. When accidents and failures occur, instead of looking for human error, we look for how we can redesign the system to prevent the accident from happening again.

Table 4.1: The Westrum Organizational Typology Model How organizations process information.

Pathological Organization        Bureaucratic Organization         Generative Organization

Information is actively Information is hidden          Information may be ignored sought

Messengers are “shot”           Messengers are tolerated          Messengers are trained

Responsibilities are             Responsibilities are Responsibilities are shirked compartmented                        shared

Bridging between teams is      Bridging between teams allowed      Bridging between teams discouraged                     but discouraged                   is rewarded

Failure is covered up        Organization is just; merciful       Failure causes injury

New ideas are crushed           New ideas create problems        New ideas are welcomed

Source: Ron Westrum, “A typology of organisation culture,” BMJ Quality & Safety 13, no. 2 (2004), doi:10.1136/qshc.2003.009522.

For instance, we may conduct a blameless post-mortem (also known as a retrospective) after every incident to gain the best understanding of how the accident occurred and agree upon what the best countermeasures are to improve the system, ideally preventing the problem from occurring again and enabling faster detection and recovery. By doing this, we create organizational learning. As Bethany Macri, an engineer at Etsy who led the creation of the Morgue tool to help with recording of post-mortems, stated, “By removing blame, you remove fear; by removing fear, you enable honesty; and honesty enables prevention.”7 Dr. Spear observes that the result of removing blame and putting organizational learning in its place is that “organizations become ever more self-diagnosing and self-improving, skilled at detecting problems [and] solving them.”8 Many of these attributes were also described by Dr. Peter Senge as attributes of learning organizations. In The Fifth Discipline, he wrote that these characteristics help customers, ensure quality, create competitive

advantage and an energized and committed workforce, and uncover the truth.9

Institutionalize the Improvement of Daily Work

Teams are often not able or not willing to improve the processes they operate within. In many organizations, they are not given the capacity or authority to experiment with improvement work and change their processes based on what they discover. The result is not only that they continue to suffer from their current problems, but their suffering also grows worse over time. Mike Rother observed in Toyota Kata that in the absence of improvements, processes don’t stay the same—due to chaos and entropy, processes actually degrade over time.10 In the technology value stream, when we avoid xing our problems, relying instead on accumulated, daily workarounds, our problems and technical debt accumulate until all we are doing is performing workarounds, trying to avoid disaster, with no cycles left over for doing productive work. This is why Mike Orzen, author of Lean IT, observed, “Even more important than daily work is the improvement of daily work.”11 We improve daily work by explicitly reserving time to pay down technical debt, x defects, and refactor and improve problematic areas of our code and environments. We do this by reserving cycles in each development interval, or by scheduling kaizen blitzes, which are periods when engineers self-organize into teams to work on xing any problem they want. The result of these practices is that everyone nds and xes problems in their area of control all the time, as part of their daily work. When we nally x the daily problems that we’ve worked around for months (or years), we can eradicate from our systems the less obvious problems. By detecting and responding to these ever-weaker failure signals, we x problems when it is not only easier and cheaper but also when the consequences are smaller. Consider the following example that improved workplace safety at Alcoa, an aluminum manufacturer with $7.8 billion in revenue in 1987.

Aluminum manufacturing requires extremely high heat, high pressures, and corrosive chemicals. In 1987, Alcoa had a frightening safety record, with 2% of the ninety thousand employee workforce being injured each year—that’s seven injuries per day. When Paul O’Neill started as CEO, his rst goal was to have zero injuries to employees, contractors, and visitors.12 O’Neill wanted to be noti ed within twenty-four hours of anyone being injured on the job—not to punish, but to ensure and promote that learnings were being generated and incorporated to create a safer workplace. Over the course of ten years, Alcoa reduced their injury rate by 95%.13 The reduction in injury rates allowed Alcoa to focus on smaller problems and weaker failure signals—instead of notifying O’Neill only when injuries occurred, they started reporting any close calls as well.‡14 By doing this, they improved workplace safety over the subsequent twenty years and have one of the most enviable safety records in the industry. As Dr. Spear writes,

Alcoans gradually stopped working around the difficulties, inconveniences, and impediments they experienced. Coping, fire fighting, and making do were gradually replaced throughout the organization by a dynamic of identifying opportunities for process and product improvement. As those opportunities were identified and the problems were investigated, the pockets of ignorance that they reflected were converted into nuggets of knowledge.15

This did more than reduce safety incidents; this helped give the company a greater competitive advantage in the market. Similarly, in the technology value stream, as we make our system of work safer, we nd and x problems from ever-weaker failure signals. For example, we may initially perform blameless post-mortems only for customer-impacting incidents. Over time, we may perform them for lesser team-impacting incidents and near misses as well.

Transform Local Discoveries into Global Improvements

When new learnings are discovered locally, there must also be some mechanism to enable the rest of the organization to use and bene t from that knowledge. In other words, when teams or individuals have experiences that create expertise, our goal is to convert that tacit knowledge (i.e., knowledge that is difficult to transfer to another person by means of writing it down or verbalizing) into explicit, codi ed knowledge, which becomes someone else’s expertise through practice. This ensures that when anyone else does similar work, they do so with the cumulative and collective experience of everyone in the organization who has ever done the same work. A remarkable example of turning local knowledge into global knowledge is the US Navy’s Nuclear Power Propulsion Program (also known as “NR” for “Naval Reactors”), which has over 5,700 reactor-years of operation without a single reactor-related casualty or escape of radiation.16 The NR is known for their intense commitment to scripted procedures and standardized work, and the need for incident reports for any departure from procedure or normal operations to accumulate learnings, no matter how minor the failure signal—they constantly update procedures and system designs based on these learnings. The result is that when a new crew sets out to sea on their rst deployment, they and their officers bene t from the collective knowledge of 5,700 accident-free reactor years. Equally impressive is that their own experiences at sea will be added to this collective knowledge, helping future crews safely achieve their own missions. In the technology value stream, we must create similar mechanisms to create global knowledge, such as making all our blameless post-mortem reports searchable by teams trying to solve similar problems, and by creating shared source code repositories that span the entire organization, where shared code, libraries, and con gurations that embody the best collective knowledge of the entire organization can be easily utilized. All these mechanisms help convert individual expertise into artifacts that the rest of the organization can use.

Inject Resilience Pa   erns into Our Daily Work

Lower-performing manufacturing organizations buffer themselves from disruptions in many ways—in other words, they bulk up or add waste. For instance, to reduce the risk of a work center being idle (due to inventory arriving late, inventory that had to be scrapped, etc.), managers may choose to stockpile more inventory at each work center. However, that inventory buffer also increases WIP, which has all sorts of undesired outcomes, as previously discussed. Similarly, to reduce the risk of a work center going down due to machinery failure, managers may increase capacity by buying more capital equipment, hiring more people, or even increasing oor space. All these options increase costs. In contrast, high performers achieve the same results (or better) by improving daily operations, continually introducing tension to elevate performance, as well as engineering more resilience into their system. Consider a typical experiment at one of Aisin Seiki Global’s mattress factories, one of Toyota’s top suppliers. Suppose they had two production lines, each capable of producing one hundred units per day. On slow days, they would send all production onto one line, experimenting with ways to increase capacity and identify vulnerabilities in their process, knowing that if overloading the line caused it to fail, they could send all production to the second line. By relentless and constant experimentation in their daily work, they were able to continually increase capacity, often without adding any new equipment or hiring more people. The emergent pattern that results from these types of improvement rituals not only improves performance but also improves resilience, because the organization is always in a state of tension and change. This process of applying stress to increase resilience was named antifragility by author and risk analyst Dr. Nassim Nicholas Taleb.17 In the technology value stream, we can introduce the same type of tension into our systems by seeking to always reduce deployment lead times, increase test coverage, decrease test execution times, and even by rearchitecting if necessary to increase developer productivity or increase reliability.

We may also perform game day exercises, where we rehearse large scale failures, such as turning off entire data centers. Or we may inject everlarger scale faults into the production environment (such as the famous Net ix Chaos Monkey, which randomly kills processes and compute servers in production) to ensure that we’re as resilient as we want to be.

Leaders Reinforce a Learning Culture

Traditionally, leaders are expected to be responsible for setting objectives, allocating resources for achieving those objectives, and establishing the right combination of incentives. Leaders also establish the emotional tone for the organizations they lead. In other words, leaders lead by “making all the right decisions.” However, there is signi cant evidence that shows greatness is not achieved by leaders making all the right decisions—instead, the leader’s role is to create the conditions so their team can discover greatness in their daily work. In other words, creating greatness requires both leaders and workers, each of whom are mutually dependent upon each other. Jim Womack, author of Gemba Walks, described the complementary working relationship and mutual respect that must occur between leaders and frontline workers. According to Womack, this relationship is necessary because neither can solve problems alone—leaders are not close enough to the work, which is required to solve any problem, and frontline workers do not have the broader organizational context or the authority to make changes outside of their area of work.18§ Leaders must elevate the value of learning and disciplined problemsolving. Mike Rother formalized these methods in what he calls the coaching kata. The result is one that mirrors the scienti c method, where we explicitly state our True North goals, such as “sustain zero accidents” in the case of Alcoa, or “double throughput within a year” in the case of Aisin.19 These strategic goals then inform the creation of iterative, shorterterm goals, which are cascaded and then executed by establishing target conditions at the value-stream or work-center level (e.g., “reduce lead time by 10% within the next two weeks”).

These target conditions frame the scienti c experiment: we explicitly state the problem we are seeking to solve, our hypothesis of how our proposed countermeasure will solve it, our methods for testing that hypothesis, our interpretation of the results, and our use of learnings to inform the next iteration. The leader helps coach the person conducting the experiment with questions that may include:

  - What was your last step and what happened?

  - What did you learn?

  - What is your condition now?

  - What is your next target condition?

  - What obstacle are you working on now?

  - What is your next step?

  - What is your expected outcome?

  - When can we check?

This problem-solving approach, in which leaders help workers see and solve problems in their daily work, is at the core of the Toyota Production System, learning organizations, the Improvement Kata, and highreliability organizations. Mike Rother observes that he sees Toyota “as an organization de ned primarily by the unique behavior routines it continually teaches to all its members.”20 In the technology value stream, this scienti c approach and iterative method guides all of our internal improvement processes, but also how we perform experiments to ensure that the products we build actually help our internal and external customers achieve their goals.

## Case Study: New To Second

EDITION

The Story of Bell Labs (1925)

With a history spanning the development of sound motion pictures

and   technicolor,   the   transistor,   Unix,   electronic   switching   systems,

and beyond, Bell Labs has been a symbol of innovation and continued

success for almost a hundred years. With nine Nobel prizes and four

Turing      Awards,       Bell   Labs       has   applied      breakthrough             concepts        to

develop products used by nearly every human being on the planet.

What was behind the creation of a culture so pervasive that it was

seemingly          present       “in     the      air”    to     produce          these      types      of

breakthroughs?

Starting in 1925, Bell Labs was created to consolidate the research

activities of Bell Systems. And while many of its products improved

telecommunication systems, it never limited itself to a narrow field of

focus. It was in this atmosphere that Walter Shewhart (who started at

Bell Labs) developed his groundbreaking statistical-control concepts

and later collaborated on them with W. Edwards Deming to create the

Shewhart-Deming                  PDCA       (Plan,       Do,     Check,          Act)      continuous

improvement          cycle.      Their      work     formed      the      basis      for   the    Toyota

Production System.

InThe Idea Factory: Bell Labs and the Great Age of American Innovation     , Jon Gertner talks about Mervin Kelly, who envisioned an

“institute of creative technology” where a cross-skilled team across

multiple       disciplines        could      openly       collaborate            and       experiment,

recognizing that any breakthrough would come from a team rather

than a specific individual.

This     aligns   with      the   concept       of   scenius     ,   a   term   coined      by    the

pioneering composer Brian Eno. Gene Kim commonly refers to it, and

Dr. Mik Kersten discusses it in his book                   Project to Product,             as well as in

the blog post “Project to Product: From Stories to Scenius.”                                    As Eno is

credited      as    saying:      “Scenius      stands      for    the         intelligence      and    the

intuition of a whole cultural scene. It is the communal form of the

concept of the genius.”

Gertner explains that it was clear to the researchers and engineers

at   Bell    Labs    that   the       ultimate     aim    of     their        organization       was    to

transform new knowledge into new things.                              In other words, the goal

was to transform innovation into the delivery of something of societal

value.      Bell   Labs   had     a    culture     that   kept     it     continually       successful

because change and challenging the status quo were its hallmarks.

A vital aspect of the culture was that there should be no fear of

failures. As Kelly explained, “The odds of creating a new and popular

technology were always stacked against the innovator; only where

the environment allowed failure could truly groundbreaking ideas be

pursued.”

Even concepts like Chaos Monkey and the SRE model have their

roots    in   Bell   Labs’   work   in   the   hardening   of   telecommunication

systems,      which      achieved   five-nines    availability   by   disrupting      these

systems as part of the normal testing cycle and then ensured their

robustness through the automation of recovery actions.

So as we talk today about collaboration using cross-skilled teams,

continuous           improvement,        providing   psychological         safety,    and

harnessing the ideas of our teams, take note that these concepts were

present in the DNA of how Bell Labs operated. And while many people

today    may       not   know   which     company    invented        the   transistor   or

provided the brilliant rainbow colors of Oz, the concepts behind these

innovations are very much alive almost a century later.

One of the striking characteristics found in this glimpse into Bell Labs’ scenius is their commitment to building a culture that allows teams to discover greatness by engendering collaboration both vertically and horizontally.

Conclusion

The principles of the Third Way address the need for valuing organizational learning, enabling high trust and boundary-spanning between functions, accepting that failures will always occur in complex systems, and making it acceptable to talk about problems so we can create a safe system of work. It also requires institutionalizing the improvement of daily work, converting local learnings into global learnings that can be used by the entire organization, as well as continually injecting tension into our daily work.

Although fostering a culture of continual learning and experimentation is the principle of the Third Way, it is also interwoven into the First and Second Ways. In other words, improving ow and feedback requires an iterative and scienti c approach that includes framing of a target condition, stating a hypothesis of what will help us get there, designing and conducting experiments, and evaluating the results. The results are not only better performance but also increased resilience and improved organizational adaptability.

* The “name, blame, shame” pattern is part of the Bad Apple Theory criticized by Dr. Sidney Dekker

and extensively discussed in his book The Field Guide to Understanding Human Error. † Dr. Westrum talks more extensively about generative cultures in his interview with Gene Kim on The Idealcast podcast. ‡ It is astonishing, instructional, and truly moving to see the level of conviction and passion that Paul O’Neill has about the moral responsibility leaders have to create workplace safety. § Leaders are responsible for the design and operation of processes at a higher level of aggregation where others have less perspective and authority.


---

<div align="center">

[« Previous Chapter](./09_chapter_3_the_second_way_the_principles_of.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./11_part_i_conclusion.md)

</div>
