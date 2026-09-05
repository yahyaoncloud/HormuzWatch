---
title: "Introduction & Overview"
chapter: 1
total_chapters: 13
source_document: "_OceanofPDF.com_Designing_Machine_Learning_Systems_An_Iterative_Process_for_Production-Ready_Applications_-_Chip_Huyen.pdf"
start_page: 1
word_count: 724
estimated_tokens: 1266
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./02_preface.md)

</div>

---

Praise for Designing Machine Learning Systems There is so much information one needs to know to be an effective machine learning engineer. It’s hard to cut through the chaff to get the most relevant information, but Chip has done that admirably with this book. If you are serious about ML in production, and care about how to design and implement ML systems end to end, this book is essential. —Laurence Moroney, AI and ML Lead, Google One of the best resources that focuses on the first principles behind designing ML systems for production. A must-read to navigate the ephemeral landscape of tooling and platform options. —Goku Mohandas, Founder of Made With ML Chip’s manual is the book we deserve and the one we need right now. In a blooming but chaotic ecosystem, this principled view on end-to-end ML is both your map and your compass: a must-read for practitioners inside and outside of Big Tech—especially those working at “reasonable scale.” This book will also appeal to data leaders looking for best practices on how to deploy, manage, and monitor systems in the wild. —Jacopo Tagliabue, Director of AI, Coveo; Adj. Professor of MLSys, NYU This is, simply, the very best book you can read about how to build, deploy, and scale machine learning models at a company for maximum impact. Chip is a masterful teacher, and the breadth and depth of her knowledge is unparalleled. —Josh Wills, Software Engineer at WeaveGrid and former Director of Data Engineering, Slack This is the book I wish I had read when I started as an ML engineer. —Shreya Shankar, MLOps PhD Student

Designing Machine Learning Systems is a welcome addition to the field of applied machine learning. The book provides a detailed guide for people building end-to-end machine learning systems. Chip Huyen writes from her extensive, hands-on experience building real-world machine learning applications. —Brian Spiering, Data Science Instructor at Metis Chip is truly a world-class expert on machine learning systems, as well as a brilliant writer. Both are evident in this book, which is a fantastic resource for anyone looking to learn about this topic. —Andrey Kurenkov, PhD Candidate at the Stanford AI Lab Chip Huyen has produced an important addition to the canon of machine learning literature—one that is deeply literate in ML fundamentals, but has a much more concrete and practical approach than most. The focus on business requirements alone is uncommon and valuable. This book will resonate with engineers getting started with ML and with others in any part of the organization trying to understand how ML works. —Todd Underwood, Senior Engineering Director for ML SRE, Google, and Coauthor of Reliable Machine Learning

OceanofPDF.com

Designing Machine Learning Systems An Iterative Process for Production-Ready Applications

Chip Huyen

OceanofPDF.com

Designing Machine Learning Systems by Chip Huyen Printed in the United States of America. Published by O’Reilly Media, Inc., 1005 Gravenstein Highway North, Sebastopol, CA 95472. O’Reilly books may be purchased for educational, business, or sales promotional use. Online editions are also available for most titles (http://oreilly.com). For more information, contact our corporate/institutional sales department: 800-998-9938 or corporate@oreilly.com.

Acquisitions Editor: Nicole Butterfield

Development Editor: Jill Leonard

Production Editor: Gregory Hyman

Copyeditor: nSight, Inc.

Proofreader: Piper Editorial Consulting, LLC

Indexer: nSight, Inc.

Interior Designer: David Futato

Cover Designer: Karen Montgomery

Illustrator: Kate Dullea

May 2022: First Edition

Revision History for the First Edition 2022-05-17: First Release

See http://oreilly.com/catalog/errata.csp?isbn=9781098107963 for release details. The O’Reilly logo is a registered trademark of O’Reilly Media, Inc. Designing Machine Learning Systems, the cover image, and related trade dress are trademarks of O’Reilly Media, Inc. The views expressed in this work are those of the author, and do not represent the publisher’s views. While the publisher and the author have used good faith efforts to ensure that the information and instructions contained in this work are accurate, the publisher and the author disclaim all responsibility for errors or omissions, including without limitation responsibility for damages resulting from the use of or reliance on this work. Use of the information and instructions contained in this work is at your own risk. If any code samples or other technology this work contains or describes is subject to open source licenses or the intellectual property rights of others, it is your responsibility to ensure that your use thereof complies with such licenses and/or rights. 978-1-098-10796-3 [LSI]

OceanofPDF.com


---

<div align="center">

[Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./02_preface.md)

</div>
