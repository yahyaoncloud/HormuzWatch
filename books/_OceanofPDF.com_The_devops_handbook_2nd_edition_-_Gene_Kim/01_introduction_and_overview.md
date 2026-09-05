---
title: "Introduction & Overview"
chapter: 1
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 1
word_count: 1990
estimated_tokens: 3388
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./02_foreword_to_the_second_edition.md)

</div>

---

25 NW 23rd Pl, Suite 6314 Portland, OR 97210

this book, write to Permissions, IT Revolution Press, LLC, 25 NW 23rd Pl, Suite 6314, Portland, OR 97210

The DevOps Handbook, Second Edition © 2021 by Gene Kim, Matthew "Jez" Humble, Patrick Debois, John Willis, and Nicole Forsgren

First edition © 2016 by Gene Kim, Jez Humble, Patrick Debois, and John Willis Printed in the United States of America

27 26 25 24 23 22 21     1 2 3 4 5 6 7 8 9 10

Cover design by Devon Smith Creative Cover illustration by eboy Book design by Devon Smith Creative

## Isbn: 9781950508402

eBook ISBN: 9781950508433 Web PDF ISBN: 9781942788867 Audio ISBN: 9781950508440

The author of the 18F case study has dedicated the work to the public domain by waiving all of his or her rights to the work worldwide under copyright law, including all related and neighboring rights, to the extent allowed by law. You can copy, modify, distribute, and perform case study 18F, even for commercial purposes, all without asking permission.

For information about special discounts for bulk purchases or for information on booking authors for an event, please visit ITRevolution.com.

## The Devops Handbook, Second Edition

CONTENTS

Figures & Tables Note from the Publisher on the Second Edition Foreword to the Second Edition: Nicole Forsgren Foreword to the First Edition: John Allspaw Preface Introduction

# Part I: —The Three Ways

# Part I: Introduction

01 Agile, Continuous Delivery, and the Three Ways NEW Case Study: Approaching Cruising Altitude: American Airlines’ DevOps Journey (Part 1) (2020) 02 The First Way: The Principles of Flow NEW Case Study: Flow and Constraint Management in Healthcare (2021) 03 The Second Way: The Principles of Feedback NEW Case Study: Pulling the Andon Cord at Excella (2018) 04 The Third Way: The Principles of Continual Learning and Experimentation NEW Case Study: The Story of Bell Labs (1925) Part 1 Conclusion

# Part II: —Where to Start

# Part II: Introduction

05 Selecting Which Value Stream to Start With Case Study: Nordstrom’s DevOps Transformation (2014– 2015) NEW Case Study: Kessel Run: The Brownfield Transformation of a Mid-Air Refueling System (2020)

NEW Case Study: Scaling DevOps Across the Business: American Airlines’ DevOps Journey (Part 2) (2020) NEW Case Study: Saving the Economy From Ruin (With a Hyperscale PaaS) at HMRC (2020) 06 Understanding the Work in Our Value Stream, Making it Visible, and Expanding it Across the Organization Case Study: Nordstrom’s Experience with Value Stream Mapping (2015) Case Study: Operation InVersion at LinkedIn (2011) 07 How to Design Our Organization and Architecture with Conway’s Law in Mind Case Study: Conway’s Law at Etsy (2015) Case Study: API Enablement at Target (2015) 08 How to Get Great Outcomes by Integrating Operations into the Daily Work of Development Case Study: Big Fish Games (2014) NEW Case Study: Better Ways of Working at Nationwide Building Society (2020)

# Part II: Conclusion

# Part III: —The First Way: The Technical Practices of Flow

# Part III: Introduction

09 Create the Foundations of Our Deployment Pipeline Case Study: Enterprise Data Warehouse (2009) NEW Case Study: How a Hotel Company Ran $30B of Revenue in Containers (2020) 10 Enable Fast and Reliable Automated Testing Case Study: Google Web Server (2005) 11 Enable and Practice Continuous Integration Case Study: HP LaserJet Firmware (2006) Case Study: Continuous Integration of Bazaarvoice (2012) 12 Automate and Enable Low-Risk Releases Case Study: Daily Deployments at CSG International (2013) Case Study: Etsy—Self-Service Developer Deployment: An Example of Continuous Deployment (2014)

Case Study: Dixons Retail—Blue-Green Deployment for Point-of-Sale System (2008) Case Study: Dark Launch of Facebook Chat (2008) NEW Case Study: Creating a Win-Win for Dev & Ops at CSG (2016) 13 Architect for Low-Risk Releases Case Study: Evolutionary Architecture at Amazon (2002) Case Study: Strangler Fig Pattern at Blackboard Learn (2011)

# Part III: Conclusion

# Part IV: —The Second Way: The Technical Practices of Feedback

# Part IV: Introduction

14 Create Telemetry to Enable Seeing and Solving Problems Case Study: DevOps Transformation at Etsy (2012) Case Study: Creating Self-Service Metrics at LinkedIn (2011) 15 Analyze Telemetry to Better Anticipate Problems and Achieve Goals Case Study: Telemetry at Netflix (2012) Case Study: Auto-Scaling Capacity at Netflix (2012) Case Study: Advanced Anomaly Detection (2014) 16 Enable Feedback So Development and Operations Can Safely Deploy Code Case Study: Right Media (2006) Case Study: The Launch and HandOff Readiness Review Google (2010) 17 Integrate Hypothesis-Driven Development and A/B Testing into Our Daily Work Case Study: Hypothesis-Driven Development at Intuit, Inc. (2012) Case Study: Doubling Revenue Growth through Fast Release Cycle Experimentation at Yahoo! Answers (2010) 18 Create Review and Coordination Processes to Increase Quality of Our Current Work Case Study: Peer Review at GitHub (2011)

NEW Case Study: From Six-Eye Principle to Release at Scale at Adidas (2020) Case Study: Code Reviews at Google (2010) Case Study: Pair Programming Replacing Broken Code Review Processes at Pivotal Labs (2011)

# Part IV: Conclusion

# Part V: —The Third Way: The Technical Practices of Continual

Learning and Experimentation

# Part V: Introduction

19 Enable and Inject Learning into Daily Work Case Study: AWS US-East and Netflix (2011) NEW Case Study: Turning an Outage into a Powerful Learning Opportunity at CSG (2020) 20 Convert Local Discoveries into Global Improvements Case Study: Standardizing a New Technology Stack at Etsy (2010) NEW Case Study: Crowdsourcing Technology Governance at Target (2018) 21 Reserve Time to Create Organizational Learning and Improvement Case Study: Thirty-Day Challenge at Target (2015) Case Study: Internal Technology Conferences at Nationwide Insurance, Capital One, and Target (2014)

# Part V: Conclusion

# Part VI: —The Technological Practices of Integrating Information

Security, Change Management, and Compliance

# Part VI: Introduction

22 Information Security Is Everyone’s Job Every Day Case Study: Static Security Testing at Twitter (2009) Case Study: 18F Automating Compliance for the Federal Government with Compliance Masonry (2016)

Case Study: Instrumenting the Environment at Etsy (2010) NEW Case Study: Shifting Security Left at Fannie Mae (2020) 23 Protecting the Deployment Pipeline Case Study: Automated Infrastructure Changes as Standard Changes at Salesforce.com (2012) Case Study: PCI Compliance and a Cautionary Tale of Separating Duties at Etsy (2014) NEW Case Study: Biz and Tech Partnership toward Ten "No Fear Releases" Per Day at Capital One (2020) Case Study: Proving Compliance in Regulated Environments (2015) Case Study: Relying on Production Telemetry for ATM Systems (2013)

# Part VI: Conclusion

A Call to Action: Conclusion to The DevOps Handbook Afterword to the Second Edition Appendices Bibliography Notes Index Acknowledgments About the Authors

## Figures & Tables

Table 0.1: The Ever Accelerating Trend toward Faster, Cheaper, Lower Risk Delivery of Software

Time of Three Months

Dev, Test, Staging, and In Production

Table 4.1: The Westrum Organizational Typology Model

Table 5.1: American Airlines’ New Vocabulary

User-Invisible Value

Table 7.1: Specialists vs. Generalists vs. “E-shaped” Staff

Teams

Lead Times and MTTR (2019)

Table 13.1: Architectural Archetypes

Blocks

Blocks

Low Performers (2019)

and Graphite at Etsy

after Deployments

Distribution

“Three Standard Deviation” Rule

Non-Gaussian Distribution

Resulting AWS Schedule of Computer Resources

Filter

Standard Deviation” Rule

to Alert on Anomalies

Warnings and Is Quickly Fixed

(TTU)

Etsy Figure AF.1: Average Development Window by Day of Week per User Figure A.1: The Core, Chronic Conflict Facing Every IT Organization Table A.1: The Downward Spiral Figure A.2: Queue Size and Wait Times as Function of Percent Utilization Table A.2: Two Stories Figure A.3: The Toyota Andon Cord

## Note From The Publisher On The Second

EDITION

Impact of the First Edition

Since the original publication of The DevOps Handbook, data from the State of DevOps Reports and other research continue to show that DevOps improves time to value for businesses and increases productivity and worker well-being. It also helps create nimble, agile businesses that can adjust to overwhelming change, as witnessed in the COVID-19 pandemic of 2020 and beyond. “I think 2020 has been illuminating in showing what technology can do in a time of incredible crisis,” Gene Kim said in his “State of DevOps: 2020 and Beyond” article. “The crisis provided a catalyst for rapid change. And I’m thankful we were able to rise and meet it.”1 One of the underpinnings of DevOps and The DevOps Handbook is that it shows—and is indeed written for—the horses not the unicorns of the business and technology world. DevOps was never, and still is not, only effective at technology giants—the FAANGs—or startups. This book and the DevOps community as a whole have shown time and time again that DevOps practices and processes can take even the most legacy-riddled, old “horse” enterprise organization and turn it into a nimble technology organization. In 2021, it is clearer than ever before that every business is a technology business and every leader is a technology leader. Not only can technology no longer be ignored or relegated to the basements; it must

also be considered a vital part of the entire strategic endeavor of the business.

Changes to the Second Edition

In this expanded edition of The DevOps Handbook, the authors have updated the main text where new research, learnings, and experiences have developed and shaped our understanding of DevOps and how it is used in the industry. Additionally we are pleased to include renowned researcher Dr. Nicole Forsgren as co-author to help update and expand the text with new research and supporting metrics.

## Continuous Learning

We’ve added some additional insights and resources we’ve learned since the rst edition came out. These “Continuous Learning” sections are highlighted throughout the book as you see here and include new supporting data and additional resources, tools, and techniques to use on your DevOps journey.

We’ve also expanded the book with additional case studies to illustrate how far DevOps has spread throughout all industries, especially how it has spread beyond the IT department and into the C-suite itself. In addition, at the end of each case study we have added a key takeaway or two that highlight the most important, though not exclusive, lessons learned. Finally, we’ve updated the conclusion to each part with new resources to continue your learning journey.

What’s Next for DevOps and the Age of Software

If the past ve years have taught us anything, it is how important technology is and how much we can achieve when IT and the business speak openly and honestly, as DevOps facilitates.

Perhaps nothing illustrates this more than the rapid changes that were necessary due to the COVID-19 pandemic of 2020 and beyond. Through the use of DevOps, organizations mobilized technology to get services to customers, internal and external, in a moment of rapid, unprecedented change. These large, complex organizations, known for their inability to pivot and adapt quickly, suddenly had no other choice. American Airlines also was able to take advantage of their ongoing DevOps transformation to build big wins quickly, as you can read about in Chapters 1 and 5. Dr. Chris Strear relates his experiences using the Theory of Constraints to optimize ow in hospitals, as you can read about in Chapter 2. In 2020 Nationwide Building Society, the world’s largest mutual nancial institution, was able to respond in weeks to customer needs versus the typical years, thanks to their ongoing DevOps transformation. You can read more about their experience in Chapter 8. But while technology is a piece of a successful transformation into future ways of working, business leadership must lead the charge. The bottleneck of today is no longer just technical practices (though they still exist); the biggest challenge and necessity is getting business leadership on board. Transformation must be co-created between the business and technology, and the theories presented here can lead that change. The enterprise can no longer sustain a binary thought process: top down or tech only. We must achieve true collaboration. Ninety percent of that work involves getting the right people engaged, onboard, and aligned. Start there and we can maintain the resulting motivation into the future.

—IT Revolution Portland, OR June 2021


---

<div align="center">

[Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./02_foreword_to_the_second_edition.md)

</div>
