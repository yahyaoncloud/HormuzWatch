---
title: "Chapter 15: Analyze Telemetry To Better Anticipate Problems And Achieve Goals"
chapter: 27
total_chapters: 43
source_document: "_OceanofPDF.com_The_devops_handbook_2nd_edition_-_Gene_Kim.pdf"
start_page: 331
word_count: 3318
estimated_tokens: 5776
agent_instructions: "Cite section headers and use code snippets directly when referencing this document."
---

<div align="center">

[« Previous Chapter](./26_chapter_14_create_telemetry_to_enable_seeing_and.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./28_chapter_16_enable_feedback_so_development_and_operations.md)

</div>

---

As we saw in the previous chapter, we need sufficient production telemetry in our applications and infrastructure to see and solve problems as they occur. In this chapter, we will create tools that allow us to discover variances and ever-weaker failure signals hidden in our production telemetry so we can avert catastrophic failures. Numerous statistical techniques will be presented, along with case studies demonstrating their use.

Telemetry at Netflix (2012)

A great example of analyzing telemetry to proactively nd and x problems before customers are impacted can be seen at Net ix. Net ix had revenue of $6.2 billion from 75 million subscribers in 2015, $5.7 billion in reveunue in March 2020, and 209 million subscribers as of July 2021.1 One of their goals is to provide the best experience to those watching videos online around the world, which requires a robust, scalable, and resilient delivery infrastructure. Roy Rapoport describes one of the challenges of managing the Net ix cloud-based video delivery service: “Given a herd of cattle that should all look and act the same, which cattle look different from the rest? Or more concretely, if we have a thousand-node stateless compute cluster, all running the same software and subject to the same approximate traffic load, our challenge is to nd any nodes that don’t look like the rest of the nodes.”2

One of the statistical techniques that the team used at Net ix in 2012 was outlier detection, de ned by Victoria J. Hodge and Jim Austin of the University of York as detecting “abnormal running conditions from which signi cant performance degradation may well result, such as an aircraft engine rotation defect or a ow problem in a pipeline.”3 Rapoport explains that Net ix “used outlier detection in a very simple way, which was to rst compute what was the ‘current normal’ right now, given the population of nodes in a compute cluster. And then we identi ed which nodes didn’t t that pattern, and removed those nodes from production.”4 Rapoport continues,

We can automatically flag misbehaving nodes without having to actually define what the ‘proper’ behavior is in any way. And since we’re engineered to run resiliently in the cloud, we don’t tell anyone in Operations to do something—instead, we just kill the sick or misbehaving compute node, and then log it or notify the engineers in whatever form they want.5

By implementing the server outlier detection process, Rapoport states, Net ix has “massively reduced the effort of nding sick servers, and, more importantly, massively reduced the time required to x them, resulting in improved service quality. The bene t of using these techniques to preserve employee sanity, work/life balance, and service quality cannot be overstated.”6* Throughout this chapter, we will explore many statistical and visualization techniques (including outlier detection) that we can use to analyze our telemetry to better anticipate problems. This enables us to solve problems faster, cheaper, and earlier than ever, before our customer or anyone in our organization is impacted. Gurthermore, we will also create more context for our data to help us make better decisions and achieve our organizational goals.

Use Means and Standard Deviations to Detect Potential Problems

One of the simplest statistical techniques that we can use to analyze a production metric is computing its mean (or average) and standard deviations. By doing this, we can create a lter that detects when this metric is signi cantly different from its norm, and even con gure our alerting so that we can take corrective action (e.g., notify on-call production staff at 2 AM to investigate when database queries are signi cantly slower than average). When critical production services have problems, waking people at 2 AM may be the right thing to do. However, when we create alerts that are not actionable or are false-positives, we’ve unnecessarily woken up people in the middle of the night. As John Vincent, an early leader in the DevOps movement, observed, “Alert fatigue is the single biggest problem we have right now. . . . We need to be more intelligent about our alerts or we’ll all go insane.”7 We create better alerts by increasing the signal-to-noise ratio, focusing on the variances or outliers that matter. Suppose we are analyzing the number of unauthorized login attempts per day. Our collected data has a Gaussian distribution (i.e., normal or bell curve distribution) that matches the graph in the curve is the mean, and the rst, second, and third standard deviations indicated by the other vertical lines contain 68%, 95%, and 99.7% of the data, respectively.

Distribution Source: Wikipedia, “Normal Distribution,” https://en.wikipedia.org/wiki/Normal_distribution.

A common use of standard deviations is to periodically inspect the data set for a metric and alert if it has signi cantly varied from the mean. For instance, we may set an alert for when the number of unauthorized login attempts per day is three standard deviations greater than the mean. Provided that this data set has Gaussian distribution, we would expect that only 0.3% of the data points would trigger the alert. Even this simple type of statistical analysis is valuable because no one had to de ne a static threshold value, something which is infeasible if we are tracking thousands or hundreds of thousands of production metrics.†

Instrument and Alert on Undesired Outcomes

Tom Limoncelli, co-author of The Practice of Cloud System Administration: Designing and Operating Large Distributed Systems and a former Site Reliability Engineer at Google, relates the following story on monitoring:

When people ask me for recommendations on what to monitor, I joke that in an ideal world, we would delete all the alerts we currently have in our monitoring system. Then, after each user-visible outage, we’d ask what indicators would have predicted that outage and then add those to our monitoring system, alerting as needed. Repeat. Now we only have alerts that prevent outages, as opposed to being bombarded by alerts after an outage already occurred.8

In this step, we will replicate the outcomes of such an exercise. One of the easiest ways to do this is to analyze our most severe incidents in the recent past (e.g., thirty days) and create a list of telemetry that could have enabled earlier and faster detection and diagnosis of the problem, as well as easier and faster con rmation that an effective x had been implemented. For instance, if we had an issue where our NGINX web server stopped responding to requests, we would look at the leading indicators that could have warned us earlier that we were starting to deviate from standard operations, such as:

  - Application level: increasing web page load times, etc.

  - OS level: server free memory running low, disk space running low,

etc.

  - Database level: database transaction times taking longer than

normal, etc.

  - Network level: number of functioning servers behind the load

balancer dropping, etc.

Each of these metrics is a potential precursor to a production incident. For each, we would con gure our alerting systems to notify us when they deviate sufficiently from the mean so that we can take corrective action. By repeating this process on ever-weaker failure signals, we nd problems ever earlier in the life cycle, resulting in fewer customerimpacting incidents and near misses. In other words, we are preventing problems as well as enabling quicker detection and correction.

Problems That Arise When Our Telemetry Data Has Non-Gaussian

Distribution

Using means and standard deviations to detect variance can be extremely useful. However, using these techniques on many of the telemetry data sets that we use in Operations will not generate the desired results. As Dr. Tou c Boubez observes, “Not only will we get wakeup calls at 2 AM, we’ll get them at 2:37 AM, 4:13 AM, 5:17 AM. This happens when the underlying data that we’re monitoring doesn’t have a Gaussian distribution.”9 In other words, when the distribution of the data set does not have the Gaussian shape described earlier, the properties associated with standard deviations do not apply. For example, consider the scenario in which we are monitoring the number of le downloads per minute from our website. We want to detect periods when we have unusually high numbers of downloads, such as when our download rate is greater than three standard deviations from our average, so that we can proactively add more capacity.

over time, with a bar overlaid on top. When the bar is dark, the number of downloads within a given period (sometimes called a “sliding window”) is at least three standard deviations from the average. Otherwise, it is light.

Standard Deviations” Rule Source: Dr. Tou c Boubez, “Simple math for anomaly detection.”

The obvious problem that the graph shows is that we are alerting almost all of the time. This is because in almost any given period of time, we have instances when the download count exceeds our three standard deviation threshold. To con rm this, when we create a histogram (see shows the frequency of downloads per minute, we can see that it does not have the classic symmetrical bell curve shape. Instead, it is obvious that the distribution is skewed toward the lower end, showing that the majority of the time we have very few downloads per minute but that download counts frequently spike three standard deviations higher.

Gaussian Distribution Source: Dr. Tou c Boubez, “Simple math for anomaly detection.”

Many production data sets are non-Gaussian distribution. Dr. Nicole Forsgren explains, “In Operations, many of our data sets have a ‘chi square’ distribution. Using standard deviations for this data not only results in over- or under-alerting, but it also results in nonsensical results.” She continues, “When you compute the number of simultaneous downloads that are three standard deviations below the mean, you end up with a negative number, which obviously doesn’t make sense.”10 Over-alerting causes Operations engineers to be woken up in the middle of the night for protracted periods of time, even when there are few actions that they can appropriately take. The problem associated with under-alerting is just as signi cant. For instance, suppose we are monitoring the number of completed transactions, and the completed transaction count drops by 50% in the middle of the day due to a software component failure. If this is still within three standard deviations of the mean, no alert will be generated, meaning that our customers will discover the problem before we do, at which point the problem may be much more difficult to solve. Fortunately,

there are techniques we can use to detect anomalies even in non-Gaussian data sets, which are described next.

## Case Study

Auto-Scaling Capacity at Netflix (2012)

Another tool developed at Netflix to increase service quality, Scryer,

addresses some of the shortcomings of Amazon Auto Scaling (AAS),

which     dynamically           increases     and     decreases        AWS       compute      server

counts        based   on   workload         data.     Scryer   works        by   predicting   what

customer        demands         will   be   based     on   historical       usage   pa    erns   and

provisions the necessary capacity.

Scryer addressed three problems with AAS. The first was dealing

with   rapid     spikes    in    demand.       Because      AWS       instance      startup   times

could be ten to forty-five minutes, additional compute capacity was

often delivered too late to deal with spikes in demand.

The second problem was that after outages, the rapid decrease in

customer demand led to AAS removing too much compute capacity

to handle future incoming demand. The third problem was that AAS

didn’t    factor      in   known        usage       traffic      pa     erns   when        scheduling

compute capacity.

Netflix took advantage of the fact that their consumer viewing

pa   erns      were   surprisingly          consistent     and      predictable,     despite     not

having        Gaussian      distributions.

customer requests per second throughout the work week, showing

regular and consistent customer viewing pa                             erns Monday through

Friday.

Source: Jacobson, Yuan, and Joshi, “Scryer: Net ix’s Predictive Auto Scaling Engine,” The Net ix Tech Blog, November 5, 2013, http://techblog.net ix.com/2013/11/scryer-net ixspredictive-auto-scaling.html.

Scryer   uses    a   combination     of   outlier   detections   to   throw   out

spurious data points and then uses techniques such as fast fourier

transform     (FFT)   and    linear   regression    to   smooth     the    data   while

preserving legitimate traffic spikes that recur in their data. The result

is that Netflix can forecast traffic demand with surprising accuracy.

(See

Resulting AWS Schedule of Compute Resources (Source: Jacobson, Yuan, Joshi, “Scryer: Net ix’s Predictive Auto Scaling Engine.”)

Only    months      after    first   using      Scryer   in   production,      Netflix

significantly improved their customer viewing experience, improved

service availability, and reduced Amazon EC2 costs.

The Netflix case study illustrates how the Scryer tool leveraged the power of non-Gaussian data sets to be er understand customers, and then used their behavior to detect and predict issues.

Using Anomaly Detection Techniques

When our data does not have Gaussian distribution, we can still nd noteworthy variances using a variety of methods. These techniques are broadly categorized as anomaly detection, often de ned as “the search for items or events which do not conform to an expected pattern.”14 Some of these capabilities can be found inside our monitoring tools, while others may require help from people with statistical skills. Tarun Reddy, VP of Development and Operations at Rally Software, actively advocates this active collaboration between Operations and statistics, observing:

to better enable service quality, we put all our production metrics into Tableau, a statistical analysis software package. We even have an Ops engineer trained in statistics who writes R code (another statistical package)—this engineer has her own backlog, filled with requests from other teams inside the company who want to find variance ever earlier, before it causes an even larger variance that could affect our customers.15

One of the statistical techniques we can use is called smoothing, which is especially suitable if our data is a time series, meaning each data point has a time stamp (e.g., download events, completed transaction events, etc.). Smoothing often involves using moving averages (or rolling averages), which transform our data by averaging each point with all the other data within our sliding window. This has the effect of smoothing out short-term uctuations and highlighting longer-term trends or cycles.‡ An example of this smoothing effect is shown in line represents the raw data, while the dark line indicates the thirty day moving average (i.e., the average of the trailing thirty days).§

Source: Jacobson, Yuan, Joshi, “Scryer: Net ix’s Predictive Auto Scaling Engine.”

More exotic ltering techniques exist, such as fast fourier transforms, which has been widely used in image processing, and the KolmogorovSmirnov test (found in Graphite and Grafana), which is often used to nd similarities or differences in periodic/seasonal metric data. We can expect that a large percentage of telemetry concerning user data will have periodic/seasonal similarities—web traffic, retail transactions, movie watching, and many other user behaviors have very regular and surprisingly predictable daily, weekly, and yearly patterns. This enables us to be able to detect situations that vary from historical norms, such as when our order transaction rate on a Tuesday afternoon drops to 50% of our weekly norms. Because of the usefulness of these techniques in forecasting, we may be able to nd people in the Marketing or Business Intelligence departments with the knowledge and skills necessary to analyze this data. We may want to seek these people out and explore working together to identify shared problems and use improved anomaly detection and incident prediction to solve them.¶

## Case Study

Advanced Anomaly Detection (2014)

At   Monitorama          in   2014,   Dr.   Toufic    Boubez   described      the   power     of

using   anomaly          detection         techniques,   specifically      highlighting     the

effectiveness        of   the    Komogorov-Smirnov           test,   a    technique    that   is

often    used   in   statistics        to   determine     whether    two    data    sets   differ

significantly and is found in the popular Graphite and Grafana tools.

commerce       site.     Note     the       weekly   periodicity    of   the   graph,     with

transaction volume dropping on the weekends. By visual inspection,

we can see that something peculiar seems to happen on the fourth

week when normal transaction volume doesn’t return to normal levels

on Monday. This suggests an event we should investigate.

Standard Deviations” Rule (Source: Dr. Tou c Boubez, “Simple math for anomaly detection.”)

Using the three standard deviations rule would only alert us twice,

missing the critical Monday dropoff in transaction volume. Ideally, we

would   also   want     to   be   alerted   that   the   data     has     drifted     from   our

expected Monday pa            ern.

“Even     saying     ‘Kolmogorov-Smirnov’             is   a   great   way    to   impress

everyone,” Dr. Boubez jokes.

But   what    Ops       engineers     should   tell      statisticians     is   that

these     types    of   non-parametric        techniques        are    great     for

Operations data, because it makes no assumptions about

normality     or   any    other      probability    distribution,      which      is

crucial for us to understand what’s going on in our very

complex       systems.          These     techniques           compare          two

probability distributions, allowing us to compare periodic

or seasonal data, which helps us find variances in data that

varies from day to day or week to week.

with   the    third    area    highlighting    the     anomalous    Monday      where

transaction volume didn’t return to normal levels. This would have

alerted us of a problem in our system that would have been virtually

impossible      to    detect    using   visual   inspection    or   using     standard

deviations.    In    this   scenario,   this   early   detection    could   prevent   a

customer impacting event, as well as be                er enable us to achieve our

organizational goals.

to Alert on Anomalies Source: Dr. Tou c Boubez, “Simple math for anomaly detection.”

This case study demonstrates how we can still find valuable variances in data, even without Guassian distribution. It illustrates how we can use these techniques in our work, as well

as how they're likely being used in our organizations in completely different applications.

Conclusion

In this chapter, we explored several different statistical techniques that can be used to analyze our production telemetry so we can nd and x problems earlier than ever, often when they are still small and long before they cause catastrophic outcomes. This enables us to nd ever-weaker failure signals that we can then act upon, creating an ever-safer system of work, as well as increasing our ability to achieve our goals. Speci c case studies were presented, including how Net ix used these techniques to proactively remove servers from production and auto-scale their compute infrastructure. We also discussed how to use a moving average and the Kolmogorov-Smirnov lter, both of which can be found in popular telemetry graphing tools. In the next chapter, we will describe how to integrate production telemetry into the daily work of Development in order to make deployments safer and improve the system as a whole.

* The work done at Netflix highlights one very specific way we can use telemetry to mitigate problems

before they impact our customers and before they snowball into significant problems for our teams. † For the remainder of this book, we will use the terms telemetry, metric, and data sets interchangeably—in other words, a metric (e.g., “page load times”) will map to a data set (e.g., 2 ms, 8 ms, 11 ms, etc.), the term used by statisticians to describe a matrix of data points where each column represents a variable of which statistical operations are performed. ‡ Smoothing and other statistical techniques are also used to manipulate graphic and audio files—for instance, image smoothing (or blurring) as each pixel is replaced by the average of all its neighbors. § Other examples of smoothing filters include weighted moving averages or exponential smoothing (which linearly or exponentially weight more recent data points over older data points, respectively), and so forth. ¶ Tools we can use to solve these types of problems include Microsoft Excel (which remains one of the easiest and fastest ways to manipulate data for one-time purposes), as well as statistical packages such as SPSS, SAS, and the open source R project, now one of the most widely used statistical packages. Many other tools have been created, including several that Etsy has open-sourced, such as Oculus, which finds graphs with similar shapes that may indicate correlation; Opsweekly, which tracks alert volumes and frequencies; and Skyline, which attempts to identify anomalous behavior in system and application graphs.


---

<div align="center">

[« Previous Chapter](./26_chapter_14_create_telemetry_to_enable_seeing_and.md) • [Table of Contents](./README.md) • [Agent Manifest](./AGENTS.md) • [Next Chapter »](./28_chapter_16_enable_feedback_so_development_and_operations.md)

</div>
