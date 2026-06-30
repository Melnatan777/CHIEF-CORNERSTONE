const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageBreak, Footer, PageNumber } = require('docx');
const fs = require('fs');

const GREEN = '1B3A1B';
const GOLD = 'D4A227';
const RED = '8B1A1A';
const LIGHT = 'F0F4F0';
const WHITE = 'FFFFFF';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const greenBorder = { style: BorderStyle.SINGLE, size: 4, color: GREEN };
const greenBorders = { top: greenBorder, bottom: greenBorder, left: greenBorder, right: greenBorder };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    children: [new TextRun({ text, bold: true, size: 36, color: GREEN, font: 'Arial' })],
    spacing: { before: 0, after: 240 },
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, bold: true, size: 26, color: GREEN, font: 'Arial' })],
    spacing: { before: 240, after: 120 },
  });
}
function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 22, color: RED, font: 'Arial' })],
    spacing: { before: 180, after: 80 },
  });
}
function body(text) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
    spacing: { before: 60, after: 60 },
  });
}
function bold(label, text) {
  return new Paragraph({
    children: [
      new TextRun({ text: label + ' ', bold: true, size: 22, font: 'Arial' }),
      new TextRun({ text, size: 22, font: 'Arial' }),
    ],
    spacing: { before: 60, after: 60 },
  });
}
function bullet(text, ref) {
  return new Paragraph({
    numbering: { reference: ref || 'bullets', level: 0 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
    spacing: { before: 40, after: 40 },
  });
}
function numbered(text, ref) {
  return new Paragraph({
    numbering: { reference: ref || 'steps', level: 0 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
    spacing: { before: 40, after: 40 },
  });
}
function sp() { return new Paragraph({ children: [new TextRun('')], spacing: { before: 80, after: 80 } }); }
function note(text) {
  return new Paragraph({
    children: [new TextRun({ text: 'NOTE: ' + text, size: 20, color: '7a5500', italics: true, font: 'Arial' })],
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
  });
}
function box(label, text, bg, borderColor) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [new TableRow({ children: [new TableCell({
      borders: { top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
                 bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
                 left: { style: BorderStyle.SINGLE, size: 8, color: borderColor },
                 right: { style: BorderStyle.SINGLE, size: 1, color: borderColor } },
      shading: { fill: bg, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      children: [
        new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 22, font: 'Arial', color: borderColor })] }),
        new Paragraph({ children: [new TextRun({ text, size: 20, font: 'Arial' })], spacing: { before: 60 } }),
      ]
    })]})],
  });
}
function twoColTable(rows) {
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [4000, 5360],
    rows: rows.map(([left, right, bold1]) => new TableRow({ children: [
      new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, shading: { fill: LIGHT, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: left, font: 'Arial', size: 20, bold: !!bold1 })] })] }),
      new TableCell({ borders, width: { size: 5360, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: right, font: 'Arial', size: 20 })] })] }),
    ]})),
  });
}
function sigLine(label) {
  return new Paragraph({
    children: [new TextRun({ text: label + ':  _______________________________________________   Date: __________', size: 22, font: 'Arial' })],
    spacing: { before: 120, after: 120 },
  });
}

const children = [

  // COVER
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2880, after: 300 }, children: [new TextRun({ text: 'CHIEF CORNERSTONE', bold: true, size: 52, color: GREEN, font: 'Arial' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 200 }, children: [new TextRun({ text: 'Client Onboarding & Service Agreement', size: 30, color: GOLD, font: 'Arial' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 800 }, children: [new TextRun({ text: 'Sites by Mel — Confidential Business Document', size: 22, color: '888888', italics: true, font: 'Arial' })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '"Unless the Lord builds the house, the builders labor in vain." — Psalm 127:1', size: 20, italics: true, color: '555555', font: 'Arial' })] }),
  new Paragraph({ children: [new PageBreak()] }),

  // PART 1: WHAT THE CLIENT GETS
  h1('Part 1: What Your Client Gets'),
  body('Every Chief Cornerstone client receives a complete, professional landscaping business platform — hosted, managed, and supported by you. Here is exactly what is included.'),
  sp(),

  h2('Public Website — 17 Pages'),
  twoColTable([
    ['Home', 'Full-screen sliding hero (5 photos), services preview, faith statement, CTA', true],
    ['Services', 'All 6 service cards with photos and "View Service" buttons'],
    ['Lawn Maintenance', 'Dedicated page with hero photo, checklist, scripture, sidebar'],
    ['Landscape Design', 'Dedicated page — same format'],
    ['Tree & Shrub Trimming', 'Dedicated page — same format'],
    ['Irrigation Systems', 'Dedicated page — same format'],
    ['Hardscaping', 'Dedicated page — same format'],
    ['Seasonal Cleanup', 'Dedicated page — same format'],
    ['About', 'Company story, values, custom SVG icons, scripture'],
    ['Gallery', 'Photo grid managed from CMS'],
    ['Testimonials', '6 client review cards + Google review CTA'],
    ['FAQ', 'Accordion-style questions and answers'],
    ['Service Area', 'Interactive Texas map with city coverage list'],
    ['Blog', '6 article cards covering Texas landscaping topics'],
    ['Contact', 'Quote request form — feeds directly to CMS'],
    ['Privacy Policy', 'Full legal privacy document'],
    ['Terms of Service', 'Full legal terms document'],
  ]),
  sp(),

  h2('Business CMS — 17 Sections'),
  twoColTable([
    ['Dashboard', 'Dispatch board: today, tomorrow, full week, incoming leads', true],
    ['Clients', 'Full client manager by name, address, ZIP, service type'],
    ['Jobs', 'Job scheduler with status tracking (Scheduled / In Progress / Completed)'],
    ['Crew / Employees', 'Employee manager with roles and hourly rates'],
    ['P&L Overview', 'Full profit & loss statement with printable report'],
    ['Payroll', 'Employee compensation table with weekly/monthly/annual estimates'],
    ['Overhead', 'Insurance, vehicle, equipment, marketing tracking'],
    ['Tax Summary', 'Texas-specific tax estimate with quarterly due dates'],
    ['Customer Inbox', 'Log customer calls, voicemails, contact form submissions'],
    ['Employee Inbox', 'Log call-outs, schedule requests, field notes by type'],
    ['Analytics & Maps', 'Revenue charts, client maps, weather patterns, area performance'],
    ['Weather Center', '7-day forecast by ZIP with rain alerts and scheduling tips'],
    ['Soil Data', 'USDA soil lookup by ZIP/county'],
    ['Gallery Manager', 'Upload and manage project photos from admin'],
    ['Quote Requests', 'All contact form submissions in one place'],
    ['Settings', 'Business name, phone, email, address'],
    ['Data Analytics', 'Revenue by month, jobs by service type, top clients, area performance'],
  ]),
  sp(),

  box('What Gets Customized Per Client',
    'Business name and logo. Brand colors. Phone and email. Service area and city. Their own hero photos (5). Services list. Admin username and password.',
    'E8F5E9', GREEN),
  sp(),

  // PART 2: PRICING
  h1('Part 2: Pricing Structure'),

  h2('Standard Pricing'),
  twoColTable([
    ['Setup Fee (one-time)', '$797 — covers customization, branding, photo setup, and deployment', true],
    ['Monthly Fee', '$99/month — hosting, maintenance, support, and updates'],
    ['Contract', 'No long-term contract. Cancel with 30 days written notice.'],
    ['Data Analytics Add-On', 'Custom quote — tailored dashboards for revenue, leads, and area performance'],
  ]),
  sp(),

  h2('What $99/Month Covers'),
  bullet('Hosting and server costs'),
  bullet('Security and software updates'),
  bullet('Up to 2 content change requests per month (text, photos, hours, services)'),
  bullet('Bug fixes and crash recovery'),
  bullet('Email support with 48-hour response time'),
  bullet('Minor design adjustments (color, font, spacing)'),
  sp(),

  h2('What $99/Month Does NOT Cover'),
  box('Service Boundaries — Read Before Signing',
    'The following are NOT included in the monthly fee and will be quoted separately at $75/hour.',
    'FEF3C7', 'D4A227'),
  sp(),
  bullet('New pages or major new features'),
  bullet('Full website redesign or rebrand'),
  bullet('More than 2 content change requests per month'),
  bullet('Custom integrations with third-party software'),
  bullet('Photography or video production'),
  bullet('Domain registration or renewal (client is responsible)'),
  bullet('Third-party service fees (weather API, mapping, etc.)'),
  bullet('Emergency/rush support outside business hours'),
  sp(),

  // PART 3: SERVICE AGREEMENT
  h1('Part 3: Service Agreement'),
  body('This Service Agreement ("Agreement") is entered into between Sites by Mel ("Provider") and the client identified below ("Client"). By paying the setup fee or first month\'s fee, Client agrees to all terms in this Agreement.'),
  sp(),

  h2('Client Information'),
  twoColTable([
    ['Business Name', '_______________________________________________'],
    ['Owner Name', '_______________________________________________'],
    ['Phone', '_______________________________________________'],
    ['Email', '_______________________________________________'],
    ['Business Address', '_______________________________________________'],
    ['Service Area / City', '_______________________________________________'],
    ['Date of Agreement', '_______________________________________________'],
  ]),
  sp(),

  h2('Section 1 — Services Provided'),
  body('Provider agrees to deliver the Chief Cornerstone website and business CMS platform as described in Part 1 of this document, customized with Client\'s business name, logo, photos, colors, and contact information. Provider will deploy the platform and provide ongoing hosting and maintenance as described herein.'),
  sp(),

  h2('Section 2 — Fees and Payment'),
  bullet('Setup fee of $797 is due before work begins. Work does not start until payment is received.'),
  bullet('Monthly fee of $99 is due on the 1st of each month beginning the month after launch.'),
  bullet('Invoices unpaid after 15 days may result in service suspension.'),
  bullet('Accounts unpaid after 30 days will be terminated and the site taken offline.'),
  bullet('Additional work outside the scope of this agreement is billed at $75/hour with written approval.'),
  sp(),

  h2('Section 3 — Content Change Policy'),
  body('Client receives up to 2 content change requests per calendar month at no additional charge. A content change is defined as an update to existing text, photos, business hours, or service descriptions on existing pages.'),
  sp(),
  body('The following do NOT count as content changes and will be quoted separately:'),
  bullet('Adding new pages'),
  bullet('Building new features or functionality'),
  bullet('Redesigning existing pages'),
  bullet('More than 2 requests in a single calendar month (each additional request = $75)'),
  sp(),

  h2('Section 4 — Cancellation'),
  bullet('Either party may cancel this agreement with 30 days written notice via email.'),
  bullet('Upon cancellation, the site will remain online until the end of the paid billing period.'),
  bullet('After cancellation, Client\'s data will be available for export for 14 days.'),
  bullet('After 14 days, all Client data will be permanently deleted.'),
  bullet('Setup fees are non-refundable. Monthly fees are non-refundable for the current billing period.'),
  sp(),

  h2('Section 5 — Ownership'),
  bullet('Client owns their business content — their text, photos, logo, and client data.'),
  bullet('Provider owns the platform code, design, and underlying technology.'),
  bullet('Client may export their data at any time by request.'),
  bullet('Client may not copy, resell, or redistribute the platform or its code.'),
  sp(),

  h2('Section 6 — Domain'),
  body('Client is responsible for purchasing and renewing their own domain name. Provider will connect Client\'s domain to the platform at no additional charge. Domain registration and renewal fees are the Client\'s responsibility.'),
  sp(),

  h2('Section 7 — Uptime and Performance'),
  body('Provider will make reasonable efforts to maintain 99% uptime. Scheduled maintenance, third-party outages, or events beyond Provider\'s control are excluded from this commitment. Provider is not liable for lost revenue due to downtime.'),
  sp(),

  h2('Section 8 — Data Security'),
  body('Provider will take reasonable security precautions to protect Client data. Client is responsible for maintaining a secure admin password and not sharing login credentials. Provider is not liable for breaches resulting from Client negligence.'),
  sp(),

  h2('Section 9 — Limitation of Liability'),
  body('Provider\'s total liability under this agreement shall not exceed the total monthly fees paid in the 3 months prior to the claim. Provider is not liable for lost profits, lost data, or indirect damages of any kind.'),
  sp(),

  h2('Section 10 — Governing Law'),
  body('This Agreement is governed by the laws of the State of Texas. Any disputes shall be resolved in Bexar County, Texas.'),
  sp(),

  h2('Signatures'),
  body('By signing below, both parties agree to the terms of this Service Agreement.'),
  sp(),
  sigLine('Provider (Sites by Mel)'),
  sp(),
  sigLine('Client Business Owner'),
  sp(),

  // PART 4: ONBOARDING CHECKLIST
  h1('Part 4: Client Onboarding Checklist'),
  body('Follow these steps in order every time you onboard a new Chief Cornerstone client. This process takes approximately 2-4 hours.'),
  sp(),

  h2('Step 1 — Collect From Client'),
  numbered('Business name (exact spelling as it should appear on the site)'),
  numbered('Business phone number'),
  numbered('Business email address'),
  numbered('Business address and service area cities'),
  numbered('Logo file (PNG with transparent background preferred)'),
  numbered('5 hero photos (1920x1080px minimum)'),
  numbered('6 service photos (800x600px minimum)'),
  numbered('Their preferred admin username and password'),
  numbered('Domain name (if they have one) or help them buy one'),
  sp(),

  h2('Step 2 — Set Up the Deployment'),
  numbered('Log into your deployment platform'),
  numbered('Create a new project — deploy from CHIEF-CORNERSTONE GitHub repo'),
  numbered('Add environment variables: SESSION_SECRET, ADMIN_USER, ADMIN_PASS, PORT=3000, DB_PATH=/app/data/data.db'),
  numbered('Add a persistent volume at /app/data'),
  numbered('Wait for deployment to show ACTIVE/Online'),
  numbered('Generate a domain URL'),
  sp(),

  h2('Step 3 — Customize for the Client'),
  numbered('Replace "Chief Cornerstone" with client business name throughout the site'),
  numbered('Upload their logo'),
  numbered('Update phone, email, and address in Settings'),
  numbered('Upload their 5 hero photos — rename to hero1.jpg through hero5.jpg'),
  numbered('Upload their 6 service photos — name them service-lawn.jpg, service-design.jpg, etc.'),
  numbered('Update service area cities on the Service Area page'),
  numbered('Update admin username and password to client\'s credentials'),
  numbered('Test all 17 pages load correctly'),
  numbered('Test contact form submits and appears in Quote Requests'),
  numbered('Test admin login works'),
  sp(),

  h2('Step 4 — Connect Domain (if client has one)'),
  numbered('Log into Cloudflare (or their domain registrar)'),
  numbered('Add a CNAME record pointing their domain to your deployment URL'),
  numbered('Wait for DNS propagation (up to 48 hours)'),
  numbered('Test that the domain loads the site with HTTPS'),
  sp(),

  h2('Step 5 — Client Handoff'),
  numbered('Send client their admin URL and login credentials'),
  numbered('Walk them through the dashboard — today\'s jobs, leads, weather'),
  numbered('Show them how to add a client and schedule a job'),
  numbered('Show them how to check the weather center'),
  numbered('Send them the signed service agreement'),
  numbered('Set up monthly invoice/payment'),
  sp(),

  box('Monthly Support Reminder',
    'Each month, check in with your client. Ask if they have any change requests. Log into their admin and make sure everything is running. This 15-minute monthly check builds loyalty and justifies the $99/month.',
    'E8F5E9', GREEN),
  sp(),

  // PART 5: PRICING COMPARISON
  h1('Part 5: How to Sell It'),
  h2('The Comparison That Closes Deals'),
  twoColTable([
    ['What They\'d Pay Elsewhere', 'Cost', true],
    ['Wix or Squarespace website (no CMS)', '$200-$500/year'],
    ['Jobber — job scheduling only', '$49-$149/month'],
    ['QuickBooks — accounting only', '$30-$85/month'],
    ['Custom developer to build all this', '$5,000-$15,000 one-time'],
    ['Total if buying separately', '$150-$350+/month PLUS $5K-$15K upfront'],
    ['Chief Cornerstone — everything included', '$797 setup + $99/month'],
  ]),
  sp(),

  h2('The One-Sentence Pitch'),
  new Paragraph({
    children: [new TextRun({ text: '"For less than $3 a day you get your website, your client manager, your job scheduler, your expense tracker, weather alerts, soil data, and a business dashboard — all in one place built specifically for landscapers."', size: 24, italics: true, font: 'Arial', color: GREEN })],
    spacing: { before: 120, after: 120 },
    indent: { left: 360, right: 360 },
  }),
  sp(),
  body('Always end with: "Can I show you a demo?"'),
  sp(),

  box('Your Cost Per Client',
    'Your deployment cost per client is approximately $10-20/month. You charge $99/month. Your margin is $75-89/month per client. With 10 clients you earn $750-890/month in recurring revenue while you sleep.',
    'E8F5E9', GREEN),

];

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: 'bullet', text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'steps', levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 36, bold: true, font: 'Arial', color: GREEN }, paragraph: { spacing: { before: 0, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: 'Arial', color: GREEN }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } }
    },
    footers: {
      default: new Footer({ children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'Chief Cornerstone — Confidential  |  Sites by Mel  |  Page ', size: 18, color: '888888', font: 'Arial' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888', font: 'Arial' }),
        ]
      })] })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('C:\\Users\\mbill\\Documents\\ChiefCornerstone-Client-Kit.docx', buf);
  console.log('Done — saved to C:\\Users\\mbill\\Documents\\ChiefCornerstone-Client-Kit.docx');
}).catch(e => { console.error(e); process.exit(1); });
