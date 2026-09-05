---
title: "Chapter 17: Integrate Hypothesis-driven Development And A/b Testing Into Our Daily Work"
chapter: 29
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 363
word_count: 2682
estimated_tokens: 4753
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./28_chapter_16_enable_feedback_so_development_and_operations.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./30_chapter_18_create_review_and_coordination_processes_to.md)

</div>

---

All too often in software projects, developers work on features for months or years spanning multiple releases without ever con rming whether the desired business outcomes are being met, such as whether a particular feature is achieving the desired results or even being used at all. Worse, even when we discover that a given feature isn’t achieving the desired results, making corrections to the feature may be out-prioritized by other new features, ensuring that the under-performing feature will never achieve its intended business goal. In general, Jez Humble, coauthor of this book, observes, “the most inefficient way to test a business model or product idea is to build the complete product to see whether the predicted demand actually exists.”1 Before we build a feature, we should rigorously ask ourselves, “Should we build it and why?” We should then perform the cheapest and fastest experiments possible to validate through user research whether the intended feature will actually achieve the desired outcomes. We can use techniques such as hypothesis-driven development, customer acquisition funnels, and A/B testing, concepts we explore throughout this chapter. Intuit, Inc. provides a dramatic example of how organizations use these techniques to create products that customers love, to promote organizational learning, and to win in the marketplace.

Hypothesis-Driven Development at Intuit, Inc. (2012)

Intuit is focused on creating business and nancial management solutions to simplify life for small businesses, consumers, and accounting professionals. In 2012, they had $4.5 billion in revenue and 8,500 employees, with agship products that include QuickBooks, TurboTax, Mint, and, until recently, Quicken.2* Scott Cook, the founder of Intuit, has long advocated building a culture of innovation, encouraging teams to take an experimental approach to product development, and exhorting leadership to support them. As he said, “Instead of focusing on the boss’s vote . . . the emphasis is on getting real people to really behave in real experiments and basing your decisions on that.”3 This is the epitome of a scienti c approach to product development. Cook explained that what is needed is “a system where every employee can do rapid, high-velocity experiments. . . . Dan Maurer runs our consumer division. . . . [which] runs the TurboTax website. When he took over, we did about seven experiments a year.”4 He continued, “By installing a rampant innovation culture [in 2010], they now do 165 experiments in the three months of the [US] tax season. Business result? [The] conversion rate of the website is up 50 percent. . . . The folks [team members] just love it, because now their ideas can make it to market.”5 Aside from the effect on the website conversion rate, one of the most surprising elements of this story is that TurboTax performed production experiments during their peak traffic seasons. For decades, especially in retailing, the risk of revenue-impacting outages during the holiday season were so high that they would often put into place a change freeze from mid-October to mid-January. However, by making software deployments and releases fast and safe, the TurboTax team made online user experimentation and any required production changes a low-risk activity that could be performed during the highest traffic and revenue-generating periods. This highlights the notion that the period when experimentation has the highest value is during peak traffic seasons. Had the TurboTax team waited until April 16th, the day after the US tax ling deadline, to implement these changes, the company could have lost many of its

prospective customers, and even some of its existing customers, to the competition. The faster we can experiment, iterate, and integrate feedback into our product or service, the faster we can learn and out-experiment the competition. And how quickly we can integrate our feedback depends on our ability to deploy and release software. The Intuit example shows that the Intuit TurboTax team was able to make this situation work for them and won in the marketplace as a result.

A Brief History of A/B Testing

As the Intuit TurboTax story highlights, an extremely powerful user research technique is de ning the customer acquisition funnel and performing A/B testing. A/B testing techniques were pioneered in direct response marketing, which is one of the two major categories of marketing strategies. The other is called mass marketing or brand marketing and often relies on placing as many ad impressions in front of people as possible to in uence buying decisions. In previous eras, before email and social media, direct response marketing meant sending thousands of postcards or yers via postal mail and asking prospects to accept an offer by calling a telephone number, returning a postcard, or placing an order.6 In these campaigns, experiments were performed to determine which offer had the highest conversion rates. They experimented with modifying and adapting the offer, rewording the offer, varying the copywriting styles, design and typography, packaging, and so forth to determine which was most effective in generating the desired action (e.g., calling a phone number, ordering a product). Each experiment often required doing another design and print run, mailing out thousands of offers, and waiting weeks for responses to come back. Each experiment typically cost tens of thousands of dollars per trial and required weeks or months to complete. However, despite the expense, iterative testing easily paid off if it signi cantly increased conversion rates (e.g., the percentage of respondents ordering a product going from 3– 12%).

Well-documented cases of A/B testing include campaign fundraising, internet marketing, and the Lean Startup methodology. Interestingly, it has also been used by the British government to determine which letters were most effective in collecting overdue tax revenue from delinquent citizens.7†

Integrating A/B Testing into Our Feature Testing

The most commonly used A/B technique in modern UX practice involves a website where visitors are randomly selected to be shown one of two versions of a page, either a control (the “A”) or a treatment (the “B”). Based on statistical analysis of the subsequent behavior of these two cohorts of users, we demonstrate whether there is a signi cant difference in the outcomes of the two, establishing a causal link between the treatment (e.g., a change in a feature, design element, background color) and the outcome (e.g., conversion rate, average order size). For example, we may conduct an experiment to see whether modifying the text or color on a “buy” button increases revenue or whether slowing down the response time of a website (by introducing an arti cial delay as the treatment) reduces revenue. This type of A/B testing allows us to establish a dollar value on performance improvements. Sometimes, A/B tests are also known as online controlled experiments and split tests. It’s also possible to run experiments with more than one variable. This allows us to see how the variables interact, a technique known as multivariate testing. The outcomes of A/B tests are often startling. Dr. Ronny Kohavi, previous Distinguished Engineer and General Manager of the Analysis and Experimentation group at Microsoft, observed that after “evaluating welldesigned and executed experiments that were designed to improve a key metric, only about one-third were successful at improving the key metric!”8 In other words, two-thirds of features either have a negligible impact or actually make things worse. Kohavi goes on to note that all these features were originally thought to be reasonable, good ideas, further elevating the need for user testing over intuition and expert opinions.9

## Continuous Learning

If you’re interested in more detail about experiment design and A/B testing, check out Trustworthy Online Controlled Experiments: A Practical Guide to A/B Testing, from authors Dr. Diane Tang, Dr. Ron Kohavi, and Dr. Ya Xu. The authors share stories from several companies that used online experimentation and A/B testing to improve their products. The book also includes tips and tricks so anyone can improve their products and services using trusted experiments and not poorly informed data that may lead them astray.

The implications of Dr. Kohavi’s data are staggering. If we are not performing user research, the odds are that two-thirds of the features we are building deliver zero or negative value to our organization, even as they make our codebase ever more complex, thus increasing our maintenance costs over time and making our software more difficult to change. Furthermore, the effort to build these features is often made at the expense of delivering features that would deliver value (i.e., opportunity cost). Jez Humble joked, “Taken to an extreme, the organization and customers would have been better off giving the entire team a vacation, instead of building one of these non–value-adding features.”10 Our countermeasure is to integrate A/B testing into the way we design, implement, test, and deploy our features. Performing meaningful user research and experiments ensures that our efforts help achieve our customer and organizational goals, and help us win in the marketplace.

Integrate A/B Testing into Our Release

Fast and iterative A/B testing is made possible by being able to quickly and easily do production deployments on demand, using feature toggles, and potentially delivering multiple versions of our code simultaneously to

customer segments. Doing this requires useful production telemetry at all levels of the application stack. By hooking into our feature toggles, we can control which percentage of users see the treatment version of an experiment. For example, we may have one-half of our customers be our treatment group and one-half get shown the following: “Similar items link on unavailable items in the cart.” As part of our experiment, we compare the behavior of the control group (no offer made) against the treatment group (offer made), perhaps measuring the number of purchases made in that session. Etsy open-sourced their experimentation framework Feature API (formerly known as the Etsy A/B API), which not only supports A/B testing but also online ramp-ups, enabling throttling exposure to experiments. Other A/B testing products include Optimizely, Google Analytics, etc. In a 2014 interview with Kendrick Wang of Apptimize, Lacy Rhoades at Etsy described their journey:

Experimentation at Etsy comes from a desire to make informed decisions, and ensure that when we launch features for our millions of members, they work. Too often, we had features that took a lot of time and had to be maintained without any proof of their success or any popularity among users. A/B testing allows us to . . . say a feature is worth working on as soon as it’s underway.11

Integrating A/B Testing into Our Feature Planning

Once we have the infrastructure to support A/B feature release and testing, we must ensure that product owners think about each feature as a hypothesis and use our production releases as experiments with real users to prove or disprove that hypothesis. Constructing experiments should be designed in the context of the overall customer acquisition funnel. Barry O’Reilly, co-author of Lean Enterprise: How High Performance Organizations Innovate at Scale, described how we can frame hypotheses in feature development in the following form:12

  - We believe increasing the size of hotel images on the booking page

  - Will result in improved customer engagement and conversion

  - We will have confidence to proceed when we see a 5% increase in

customers who review hotel images who then proceed to book in forty-eight hours.

Adopting an experimental approach to product development requires us to not only break down work into small units (stories or requirements) but also validate whether each unit of work is delivering the expected outcomes. If it does not, we modify our road map of work with alternative paths that will actually achieve those outcomes.

## Case Study

Doubling           Revenue       Growth      through        Fast      Release       Cycle

Experimentation at Yahoo! Answers (2010)

In   2009,        Jim   Stoneham     was    General     Manager       of    the    Yahoo!

Communities group that included Flickr and Answers. Previously, he

had    been       primarily    responsible   for   Yahoo!       Answers,     competing

against     other       Q&A   companies    such   as   Quora,   Aardvark,    and    Stack

Exchange.

At   that    time,   Answers   had   approximately        140   million     monthly

visitors, with over twenty million active users answering questions in

over twenty different languages. However, user growth and revenue

had fla      ened, and user engagement scores were declining.

Stoneham observes that,

Yahoo Answers was and continues to be one of the biggest

social games on the Internet; tens of millions of people are

actively trying to “level up” by providing quality answers to

questions faster than the next member of the community.

There       were    many    opportunities       to   tweak     the    game

mechanic, viral loops, and other community interactions.

When you’re dealing with these human behaviors, you’ve

got to be able to do quick iterations and testing to see

what clicks with people.

He continues,

These [experiments] are the things that Twi                                  er, Facebook,

and      Zynga      did      so   well.   Those       organizations            were     doing

experiments             at   least     twice        per    week—they           were     even

reviewing           the       changes               they     made            before     their

deployments, to make sure they were still on track. So here

I am, running [the] largest Q&A site in the market, wanting

to do rapid iterative feature testing, but we can’t release

any faster than once every 4 weeks. In contrast, the other

people in the market had a feedback loop 10x faster than

us.

Stoneham            observed        that        as    much     as    product         owners         and

developers        talk   about      being       metrics-driven,          if   experiments          are   not

performed         frequently        (daily     or    weekly),     the    focus       of   daily    work   is

merely on the feature they’re working on, as opposed to customer

outcomes.

As   the         Yahoo!    Answers         team        was    able       to    move      to   weekly

deployments, and later multiple deployments per week, their ability

to   experiment           with      new      features           increased      dramatically.         Their

astounding achievements and learnings over the next twelve months

of   experimentation               included          increased      monthly          visits    by    72%,

increased        user    engagement             by   threefold,       and     doubled       the     team’s

revenue.

To continue their success, the team focused on optimizing the

following top metrics:

     - Time to first answer: How quickly was an answer posted to a

user question?

     - Time to best answer: How quickly did the user community

award a best answer?

     - Upvotes          per    answer:       How          many     times       was    an    answer

upvoted by the user community?

     - Answers          per    week      per    person:         How   many          answers       were

users creating?

          - Second search rate: How often did visitors have to search

again to get an answer? (Lower is be              er.)

Stoneham       concluded,        “This   was    exactly    the    learning     that   we

needed to win in the marketplace—and it changed more than our

feature velocity. We transformed from a team of employees to a team

of   owners.      When   you   move     at    that   speed,   and     are   looking   at   the

numbers       and    the    results    daily,   your    investment          level   radically

changes.”

This story from Yahoo! Answers demonstrates how dramatically outcomes can be affected by faster cycle times. The faster we can iterate and integrate feedback into the product or service we are delivering to customers, the faster we can learn and the bigger the impact we can create.

Conclusion

Success requires us to not only deploy and release software quickly but also to out-experiment our competition. Techniques such as hypothesisdriven development, de ning and measuring our customer acquisition funnel, and A/B testing allow us to perform user experiments safely and easily, enabling us to unleash creativity and innovation and create organizational learning. And, while succeeding is important, the organizational learning that comes from experimentation also gives employees ownership of business objectives and customer satisfaction. In the next chapter, we examine and create review and coordination processes as a way to increase the quality of our current work.

* In 2016, Intuit sold the Quicken business to the private equity firm HIG Capital.

† There are many other ways to conduct user research before embarking on development. Among the most inexpensive methods include performing surveys, creating prototypes (either mock-ups using tools such as Balsamiq or interactive versions written in code), and performing usability testing. Alberto Savoia, Director of Engineering at Google, coined the term pretotyping for the practice of using prototypes to validate whether we are building the right thing. User research is so inexpensive

and easy relative to the effort and cost of building a useless feature in code that, in almost every case, we shouldn’t prioritize a feature without some form of validation.


---

<div align="center">

[« Previous Chapter](./28_chapter_16_enable_feedback_so_development_and_operations.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./30_chapter_18_create_review_and_coordination_processes_to.md)

</div>
