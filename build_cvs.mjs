import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const template = readFileSync(resolve(__dirname, 'templates/cv-template.html'), 'utf-8');

const baseData = {
    LANG: 'en',
    NAME: 'Sudheesh Sreenilayam',
    LOCATION: 'Chicago, IL',
    PHONE: '+1 (312) 868-9096',
    EMAIL: 'sudhisreenilayam13@outlook.com',
    LINKEDIN_URL: 'https://www.linkedin.com/in/ssudheesh/',
    PORTFOLIO_URL: 'https://sudheeshsreenilayam.github.io/',
    EDUCATION: `
<div class="entry">
    <div class="row">
        <div class="left"><strong>Master of Science in Business Analytics</strong></div>
        <div class="right">May 2026</div>
    </div>
    <div class="context">Roosevelt University, Chicago, IL</div>
    <div class="gpa">GPA: <strong>3.97/4.0</strong></div>
</div>
<div class="entry">
    <div class="row">
        <div class="left"><strong>B.Tech in Electronics & Communication Engineering</strong></div>
    </div>
    <div class="context">CUSAT, India</div>
</div>`,
    CERTIFICATIONS: `
<ul>
    <li>Lean Six Sigma Green Belt (Active)</li>
    <li>Google Data Analytics (In Progress)</li>
</ul>`
};

const cv1 = {
    ...baseData,
    SUBTITLE: 'Strategic Operations & Technical Leadership',
    TAGLINE: 'Orchestrating Operational Intelligence through Data Strategy & Global System Ownership',
    SUMMARY_TEXT: `Strategic Operations Leader with 8+ years of experience engineering delivery roadmaps for Amazon Logistics. <strong>I bridge the gap between deep managerial expertise and AI-native data automation.</strong> Promoted from entry-level Associate to Senior Manager overseeing <strong>200+ FTEs</strong> while retaining deep technical ownership. I personally architect systems that reduced operational waste by <strong>$900k annually</strong>, operating at the intersection of heavy people leadership and hands-on strategy.`,
    SKILLS: `
<p><strong>Strategy & Operations:</strong> SLA & KPI Definition, Cross-Functional Leadership, Roadmap Planning, Lean Six Sigma Green Belt, Agile/Scrum, UAT & User Stories, Stakeholder Management.</p>
<p><strong>Analytics & AI:</strong> Agentic AI Orchestration, Power BI, SQL, Python, Business Intelligence & Forecasting, Root Cause Analysis, Advanced Excel.</p>`,
    EXPERIENCE: `
<div class="company-entry">
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Senior Associate Manager, Service Delivery Management & Operations Analytics</strong></div>
            <div class="right">Sep 2023 &ndash; Aug 2024</div>
        </div>
        <div class="context">Sutherland Global Services (Amazon Logistics)</div>
        <ul>
            <li><strong>Driver App Caching:</strong> Mapped last-mile driver workflows and audited 1,000 contact samples under the "Unable to Scan" issue code (63.52% of a 2.04M contact baseline); prepared an Amazon-style 6-pager proposing a local photo cache bypass and AI geofence verification engine to deflect 909,185 contacts per annum (70% reduction), saving <strong>$900,000 in support costs</strong>.</li>
            <li><strong>Inbound Transfer Routing:</strong> Redesigned the agent console routing interface by mapping customer journeys across a 119,527 contact baseline; grouped 5,000+ destinations by department and implemented channel-specific conditional validation rules, reducing invalid transfers by 42% (deflecting ~50,000 contacts), improving transfer accuracy (CCXU) by 14% (reaching 74%), and saving <strong>$114,000 in transaction costs</strong>.</li>
            <li><strong>Global Stakeholder Management:</strong> Maintained <strong>100% SLA adherence</strong> across NA, UK, and CA regions by leading Executive Business Reviews (QBRs/MBRs/WBRs) to align resource planning with Amazon senior leadership; managed capacity for 200+ FTEs.</li>
            <li><strong>Reporting Optimization:</strong> Deployed automated Power BI dashboards globally, eliminating manual data entry/latency and improving reporting efficiency by 40%.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Associate Manager, Operations & Process Improvement</strong></div>
            <div class="right">Dec 2021 &ndash; Aug 2023</div>
        </div>
        <ul>
            <li><strong>Lean Six Sigma Green Belt Project:</strong> Led a DMAIC-structured Green Belt task force to optimize customer service quality; mapped processes (SIPOC), analyzed VOC/CTQs, and applied FMEA to reduce high-RPN failures, improving RAP from 79.38% to 82.41% (NA Recipient) and 84.78% to 87.34% (GSF), driving a 2.73% throughput gain.</li>
            <li><strong>Revenue Forecast Reconciliation:</strong> Resolved a monthly invoicing discrepancy of $9,000 per LOB (with a total site impact of ~$100,000 across 20 LOBs) by auditing Amazon's invoice files; discovered a silent reclassification of dropped contacts (3% volume share) from resolved to transfer status, updating predictive models to reduce future forecast variance to ~0%.</li>
            <li><strong>Resource Management & BCP:</strong> Engineered a predictive staffing allocation algorithm in Excel to balance shift coverage for 90+ FTEs, reducing team overtime costs by 15%; coordinated resource sharing during capacity shortages, training 30 agents on a 6-hour HOOP schedule.</li>
            <li><strong>Dashboard Deployment:</strong> Partnered with the BI team to launch real-time Power BI tracking dashboards, increasing overall Delivery Success Rate (DSR) by 7% and securing <strong>14 consecutive vendor awards</strong>.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Lead, Service Delivery Management</strong></div>
            <div class="right">Dec 2019 &ndash; Nov 2021</div>
        </div>
        <ul>
            <li><strong>Service Design & A/B Testing:</strong> Designed and executed A/B tests on customer service scripts to statistically validate communication strategies, driving a <strong>16% improvement in FCR</strong> and 30% reduction in escalations.</li>
            <li><strong>Operational Recovery & Audit:</strong> Audited 1,200 customer contacts in 2 days when NA SDS launch DSR fell 10% below target; created "DSR Tips" integrated into Amazon's global Knowledge Center, restoring targets in 3 weeks.</li>
            <li><strong>Nesting Period Optimization:</strong> Compressed the nesting training curve from 3 to 2 weeks, utilizing 2:1 nesting coaching and a 10% new hire volume cap to scale site capacity a week early.</li>
            <li><strong>Grocery LOB Launch:</strong> Managed the GSF3 Grocery MessageUs LOB launch (48 FTE) using Gantt charts, winning the Customer Obsession Award in the first month and maintaining an 18-month consecutive winning streak.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Early Career (Promoted from Associate to Senior SME)</strong></div>
            <div class="right">Jun 2016 &ndash; Nov 2019</div>
        </div>
        <ul>
            <li><strong>Proactive Data Audit:</strong> Audited 4,000 customer contact logs from CS Central to identify correlations between package delays and specific fulfillment centers or carriers, validating the absence of systemic routing bottlenecks before proposing changes; received 7 consecutive "Best Team Lead" and 6 consecutive "Best Performer" awards.</li>
            <li><strong>SLA Compliance:</strong> Achieved 100% SLA compliance by developing real-time monitoring reports via Excel Power Query.</li>
        </ul>
    </div>
</div>`,
    PROJECTS: `
<div class="entry">
    <div class="row">
        <div class="left"><strong>Superstore Profitability & Strategic Recovery</strong></div>
    </div>
    <div class="context">Python, SQL, Power BI, Regression</div>
    <ul>
        <li>Identified <strong>$218k in annual business recovery</strong> and secured $106k in margin gain by leveraging regression analysis to prove internal discounting was the primary loss driver.</li>
    </ul>
</div>
<div class="entry">
    <div class="row">
        <div class="left"><strong>SocialSphere Strategic Turnaround (Cyber Ethics)</strong></div>
    </div>
    <div class="context">Governance, Cyber Ethics & Law, Risk Management</div>
    <ul>
        <li>Mitigated <strong>$1.3B in regulatory risk</strong> and proved a 50% increase in Click-Through Rates by proposing a strategic roadmap transitioning to a contextual relevance model.</li>
    </ul>
</div>
<div class="entry">
    <div class="row">
        <div class="left"><strong>LCA Mission Control / Agentic Intelligence Engine</strong></div>
    </div>
    <div class="context">Python, SQL, Supabase, Agentic AI</div>
    <ul>
        <li>Transformed fragmented market data into real-time visibility by architecting a high-performance decision engine that syncs Labor Department datasets with live leads.</li>
    </ul>
</div>`
};

const cv2 = {
    ...baseData,
    SUBTITLE: 'Data Systems & AI Architecture',
    TAGLINE: 'Architecting End-to-End AI Systems & High-Density Data Pipelines',
    SUMMARY_TEXT: `AI-Native Systems Architect and Data Engineer with 8+ years of progressive operational experience. <strong>I bridge the gap between deep technical implementation and high-level business strategy.</strong> I engineer automated ETL pipelines, deploy agentic AI workflows, and design decision engines that reduced operational waste by <strong>$900k annually</strong>. I translate complex data environments into scalable, enterprise-level solutions.`,
    SKILLS: `
<p><strong>Data Architecture & Databases:</strong> SQL (PostgreSQL, BigQuery, Snowflake), dbt, Git LFS, Databricks, Supabase, Hadoop, Hive.</p>
<p><strong>AI Ecosystem & Automation:</strong> Agentic AI (LangChain, Claude, OpenClaw, Antigravity), Python (Pandas, Scikit-learn), n8n, Zapier.</p>
<p><strong>Machine Learning & Analytics:</strong> SVM, NLP (TF-IDF), SMOTE, Regression Trees, Random Forest, Power BI, Tableau.</p>`,
    EXPERIENCE: `
<div class="company-entry">
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Senior Associate Manager, Operations Analytics</strong></div>
            <div class="right">Sep 2023 &ndash; Aug 2024</div>
        </div>
        <div class="context">Sutherland Global Services (Amazon Logistics)</div>
        <ul>
            <li><strong>Driver App Caching:</strong> Mapped last-mile driver workflows and audited 1,000 contact samples under the "Unable to Scan" issue code (63.52% of a 2.04M contact baseline); prepared an Amazon-style 6-pager proposing a local photo cache bypass and AI geofence verification engine to deflect 909,185 contacts per annum (70% reduction), saving <strong>$900,000 in support costs</strong>.</li>
            <li><strong>Inbound Transfer Routing:</strong> Redesigned the agent console routing interface by mapping customer journeys across a 119,527 contact baseline; grouped 5,000+ destinations by department and implemented conditional validation rules, reducing invalid transfers by 42% (deflecting ~50,000 contacts), improving transfer accuracy (CCXU) by 14% (reaching 74%), and saving <strong>$114,000 in transaction costs</strong>.</li>
            <li><strong>Reporting Infrastructure:</strong> Deployed automated Power BI dashboards across the global delivery center, eliminating manual data entry/latency and improving reporting efficiency by 40%.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Associate Manager, Process Improvement</strong></div>
            <div class="right">Dec 2021 &ndash; Aug 2023</div>
        </div>
        <ul>
            <li><strong>Lean Six Sigma Green Belt Project:</strong> Led a DMAIC-structured Green Belt task force to optimize customer service quality; mapped processes (SIPOC), analyzed VOC/CTQs, and applied FMEA to reduce high-RPN failures, improving RAP from 79.38% to 82.41% (NA Recipient) and 84.78% to 87.34% (GSF), driving a 2.73% throughput gain.</li>
            <li><strong>Revenue Forecast Reconciliation:</strong> Resolved a monthly invoicing discrepancy of $9,000 per LOB (with a total site impact of ~$100,000 across 20 LOBs) by auditing Amazon's invoice files; discovered a silent reclassification of dropped contacts (3% volume share) from resolved to transfer status, updating predictive models to reduce future forecast variance to ~0%.</li>
            <li><strong>Algorithm Design:</strong> Engineered a predictive staffing allocation algorithm in Excel to balance shift coverage for 90+ FTEs, reducing team overtime costs by 15%.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Lead, Service Delivery Management</strong></div>
            <div class="right">Dec 2019 &ndash; Nov 2021</div>
        </div>
        <ul>
            <li><strong>Data Pipelines:</strong> Automated manual performance tracking and streamlined data collection pipelines, saving front-line leadership 5+ hours of labor weekly.</li>
            <li><strong>A/B Testing:</strong> Designed and executed rigorous A/B tests on customer service scripts, driving a <strong>16% improvement in FCR</strong> and 30% reduction in customer escalations.</li>
            <li><strong>Nesting Period Optimization:</strong> Compressed the nesting training curve from 3 to 2 weeks, utilizing 2:1 nesting coaching and a 10% new hire volume cap to scale site capacity a week early.</li>
        </ul>
    </div>
    <div class="entry">
        <div class="row">
            <div class="left"><strong>Early Career (Promoted from Associate to Senior SME)</strong></div>
            <div class="right">Jun 2016 &ndash; Nov 2019</div>
        </div>
        <ul>
            <li><strong>Proactive Data Audit:</strong> Audited 4,000 customer contact logs from CS Central to identify correlations between package delays and specific fulfillment centers or carriers, validating the absence of systemic routing bottlenecks before proposing changes; received 7 consecutive "Best Team Lead" and 6 consecutive "Best Performer" awards.</li>
            <li><strong>Data Monitoring:</strong> Achieved 100% SLA compliance by developing real-time monitoring reports via Excel Power Query.</li>
        </ul>
    </div>
</div>`,
    PROJECTS: `
<div class="entry">
    <div class="row">
        <div class="left"><strong>Chicago 311 Accountability Dashboard</strong></div>
    </div>
    <div class="context">Python, ETL, React, D3.js, GitHub Actions</div>
    <ul>
        <li>Automated the nightly processing of <strong>1M+ records</strong> from the Chicago Open Data Portal to investigate urban service inequities by engineering a cost-efficient "Static-Site Data Orchestration" system.</li>
    </ul>
</div>
<div class="entry">
    <div class="row">
        <div class="left"><strong>Fake Job Posting Detection (Machine Learning)</strong></div>
    </div>
    <div class="context">Python (NLP, SMOTE), SVM, Scikit-learn</div>
    <ul>
        <li>Achieved a top <strong>F1-Score of 0.84</strong> in fraud detection by managing the end-to-end development of an ML pipeline and addressing a 95% class imbalance using SMOTE and SVM classification.</li>
    </ul>
</div>
<div class="entry">
    <div class="row">
        <div class="left"><strong>Distributed Systems & MapReduce Implementation</strong></div>
    </div>
    <div class="context">AWS EMR, Hadoop, Hive, HBase</div>
    <ul>
        <li>Optimized high-volume trade price aggregation and query performance by designing distributed computing tasks leveraging HDFS Architecture.</li>
    </ul>
</div>`
};

function buildHtml(data) {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        result = result.replace(new RegExp("\\{\\{" + key + "\\}\\}", 'g'), value);
    }
    return result;
}

writeFileSync(resolve(__dirname, 'output/cv1.html'), buildHtml(cv1));
writeFileSync(resolve(__dirname, 'output/cv2.html'), buildHtml(cv2));

console.log('HTML files generated. Now generating PDFs...');

execSync('node generate-pdf.mjs output/cv1.html output/Sudheesh_Strategic_Leadership_CV_2026.pdf', { stdio: 'inherit' });
execSync('node generate-pdf.mjs output/cv2.html output/Sudheesh_Data_AI_Architecture_CV_2026.pdf', { stdio: 'inherit' });

console.log('PDFs generated successfully.');
