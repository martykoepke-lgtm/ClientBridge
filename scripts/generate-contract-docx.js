const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, PageNumber, PageBreak } = require(
  path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'docx')
);

// ── Contract Data (DIS LLC) ──
const CLIENT_NAME = 'Digital Integration Strategies, LLC';
const CLIENT_STATE = 'Virginia';
const CONTRACTOR_NAME = 'Martha Koepke / Practical Informatics, LLC';

// New sections (15-22) that should be highlighted yellow
const NEW_SECTION_IDS = [15, 16, 17, 18, 19, 20, 21, 22];

const YELLOW_HIGHLIGHT = 'FFFF00';

function isNew(num) { return NEW_SECTION_IDS.includes(num); }

function sectionHeading(num, title, highlighted) {
  return new Paragraph({
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text: `${num}. ${title}`,
        bold: true,
        size: 26,
        font: 'Arial',
        ...(highlighted ? { shading: { type: ShadingType.CLEAR, fill: YELLOW_HIGHLIGHT } } : {}),
      }),
    ],
  });
}

function subsectionHeading(id, title, highlighted) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    indent: { left: 360 },
    children: [
      new TextRun({
        text: `${id}. ${title}`,
        bold: true,
        size: 22,
        font: 'Arial',
        ...(highlighted ? { shading: { type: ShadingType.CLEAR, fill: YELLOW_HIGHLIGHT } } : {}),
      }),
    ],
  });
}

function bodyText(text, highlighted, indent) {
  return new Paragraph({
    spacing: { after: 120 },
    indent: indent ? { left: 360 } : undefined,
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Arial',
        ...(highlighted ? { shading: { type: ShadingType.CLEAR, fill: YELLOW_HIGHLIGHT } } : {}),
      }),
    ],
  });
}

function bulletItem(text, highlighted) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 720, hanging: 360 },
    children: [
      new TextRun({
        text: '\u2022  ' + text,
        size: 22,
        font: 'Arial',
        ...(highlighted ? { shading: { type: ShadingType.CLEAR, fill: YELLOW_HIGHLIGHT } } : {}),
      }),
    ],
  });
}

// ── Table helpers ──
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: '1F3864', type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })] })],
  });
}

function dataCell(text, width, bold, shaded) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shaded ? { fill: 'F2F2F2', type: ShadingType.CLEAR } : { fill: 'FFFFFF', type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, bold: !!bold, size: 20, font: 'Arial' })] })],
  });
}

// ── Build document ──
const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 80 },
  children: [new TextRun({ text: 'INDEPENDENT CONTRACTOR AGREEMENT', bold: true, size: 32, font: 'Arial', color: '1F3864' })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 300 },
  children: [new TextRun({ text: 'Revenue Share + Milestone Compensation', size: 24, font: 'Arial', color: '1F3864' })],
}));

// Intro
children.push(bodyText(`This Independent Contractor Agreement ("Agreement") is entered into as of [DATE], by and between:`));

// Parties table
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: [
    new TableRow({ children: [
      new TableCell({
        borders, width: { size: 4680, type: WidthType.DXA },
        shading: { fill: 'D6E4F0', type: ShadingType.CLEAR }, margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: 'Company', bold: true, color: '1F3864', font: 'Arial', size: 22 })] }),
                   new Paragraph({ children: [new TextRun({ text: CLIENT_NAME, font: 'Arial', size: 20 })] }),
                   new Paragraph({ children: [new TextRun({ text: `a ${CLIENT_STATE} company`, font: 'Arial', size: 20, color: '666666' })] })],
      }),
      new TableCell({
        borders, width: { size: 4680, type: WidthType.DXA },
        shading: { fill: 'F2F2F2', type: ShadingType.CLEAR }, margins: cellMargins,
        children: [new Paragraph({ children: [new TextRun({ text: 'Contractor', bold: true, color: '1F3864', font: 'Arial', size: 22 })] }),
                   new Paragraph({ children: [new TextRun({ text: CONTRACTOR_NAME, font: 'Arial', size: 20 })] }),
                   new Paragraph({ children: [new TextRun({ text: 'an independent contractor', font: 'Arial', size: 20, color: '666666' })] })],
      }),
    ] }),
  ],
}));
children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

// ═══ SECTION 1: Scope of Work ═══
children.push(sectionHeading(1, 'SCOPE OF WORK', false));
children.push(bodyText('Contractor agrees to provide AI architecture, development, and related technical services necessary to:'));
children.push(bulletItem('Design and build a Minimum Viable Product ("MVP")'));
children.push(bulletItem('Support development of the full, production-ready version of the product'));
children.push(bulletItem('Provide reasonable collaboration on technical strategy (approximately 30% of effort)'));
children.push(bodyText('Estimated effort is approximately 200 hours over a 3\u20136 month period.'));

// ═══ SECTION 2: Cash Compensation ═══
children.push(sectionHeading(2, 'CASH COMPENSATION', false));
children.push(bodyText('Company agrees to pay Contractor a total of $15,000, paid in three installments as follows:'));
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [3000, 3160, 3200],
  rows: [
    new TableRow({ children: [headerCell('Installment', 3000), headerCell('Amount', 3160), headerCell('Trigger', 3200)] }),
    new TableRow({ children: [dataCell('1st', 3000), dataCell('$4,000', 3160, true), dataCell('Upon execution of this Agreement', 3200)] }),
    new TableRow({ children: [dataCell('2nd', 3000, false, true), dataCell('$4,000', 3160, true, true), dataCell('Upon delivery of the MVP', 3200, false, true)] }),
    new TableRow({ children: [dataCell('3rd', 3000), dataCell('$7,000', 3160, true), dataCell('Upon completion of the full product', 3200)] }),
  ],
}));
children.push(bodyText('Full product completion shall be as reasonably defined by mutual written agreement of the parties.'));

// ═══ SECTION 3: Revenue Share ═══
children.push(sectionHeading(3, 'REVENUE SHARE', false));
children.push(subsectionHeading('3.1', 'Gross Revenue Definition', false));
children.push(bodyText('"Gross Revenue" means all revenue actually received by the Company from the product, excluding:', true));
children.push(bulletItem('Taxes'));
children.push(bulletItem('Refunds and chargebacks'));
children.push(bulletItem('Third-party payment processing fees (e.g., credit card or platform processing fees)'));
children.push(subsectionHeading('3.2', 'Base Revenue Share', false));
children.push(bodyText('Contractor shall receive 3% of Gross Revenue generated by the product. Payments shall be made monthly, within 30 days of the end of each calendar month.'));
children.push(subsectionHeading('3.3', 'Term', false));
children.push(bodyText('Revenue share payments shall continue for 36 months from the date the product first generates revenue. Upon expiration of this term, all revenue share obligations shall terminate unless otherwise agreed in writing.'));

// ═══ SECTION 4: Performance Accelerator ═══
children.push(sectionHeading(4, 'PERFORMANCE ACCELERATOR', false));
children.push(bodyText('Upon successful completion of both (a) MVP delivery and (b) full product completion, Contractor\u2019s revenue share shall be increased as follows:'));
children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4680, 4680],
  rows: [
    new TableRow({ children: [headerCell('Period', 4680), headerCell('Revenue Share Rate', 4680)] }),
    new TableRow({ children: [dataCell('First 12 months after initial revenue', 4680), dataCell('5% of Gross Revenue', 4680, true)] }),
    new TableRow({ children: [dataCell('Months 13\u201336 (remainder of term)', 4680, false, true), dataCell('4% of Gross Revenue', 4680, true, true)] }),
  ],
}));

// ═══ SECTION 5: Revenue Share Cap ═══
children.push(sectionHeading(5, 'REVENUE SHARE CAP', false));
children.push(bodyText('Total cumulative payments under Sections 3 and 4 shall be capped at $75,000. Upon reaching this cap, all revenue share obligations shall terminate, and no further payments shall be owed under those sections.'));

// ═══ SECTION 6: Milestone & Completion Conditions ═══
children.push(sectionHeading(6, 'MILESTONE & COMPLETION CONDITIONS', false));
children.push(subsectionHeading('6.1', 'Revenue Share Eligibility', false));
children.push(bodyText('Revenue share eligibility begins only upon successful delivery of the MVP. The full revenue share (including the Performance Accelerator in Section 4) requires completion of the full product.', false, true));
children.push(subsectionHeading('6.2', 'Contractor Ceases Work Prior to MVP', false));
children.push(bodyText('If Contractor ceases work prior to MVP completion, no revenue share shall be owed.', false, true));
children.push(subsectionHeading('6.3', 'Contractor Ceases Work After MVP but Before Full Completion', false));
children.push(bodyText('If Contractor ceases work after MVP delivery but before full product completion, revenue share shall be reduced on a pro-rata basis reflecting the proportion of total work completed at the time of cessation, as reasonably calculated by the parties in good faith.', false, true));

// ═══ SECTION 7: Independent Contractor Status ═══
children.push(sectionHeading(7, 'INDEPENDENT CONTRACTOR STATUS', false));
children.push(bodyText('Contractor is an independent contractor and not an employee, partner, agent, or equity holder of the Company. Contractor shall have no ownership interest in the Company and shall not be entitled to any employee benefits, workers\u2019 compensation, or similar protections. Contractor shall be solely responsible for all taxes, withholdings, and other obligations arising from compensation received under this Agreement.'));

// ═══ SECTION 8: Intellectual Property ═══
children.push(sectionHeading(8, 'INTELLECTUAL PROPERTY', false));
children.push(subsectionHeading('8.1', 'Work Made for Hire', false));
children.push(bodyText('All work product, code, models, designs, documentation, and related materials created by Contractor under this Agreement shall be considered "work made for hire" under applicable law and shall be the sole and exclusive property of the Company.', false, true));
children.push(subsectionHeading('8.2', 'Assignment', false));
children.push(bodyText('To the extent any rights do not automatically vest in the Company as work made for hire, Contractor hereby irrevocably assigns to the Company all rights, title, and interest in and to such work product, including all intellectual property rights therein.', false, true));
children.push(subsectionHeading('8.3', 'Pre-Existing IP', false));
children.push(bodyText('If Contractor incorporates any pre-existing tools, frameworks, libraries, or code owned by Contractor ("Pre-Existing IP") into the work product, Contractor shall identify such Pre-Existing IP in writing prior to incorporation. Contractor hereby grants the Company a perpetual, irrevocable, royalty-free, worldwide license to use, modify, and distribute such Pre-Existing IP solely as incorporated into the work product.', false, true));

// ═══ SECTION 9: Audit Rights ═══
children.push(sectionHeading(9, 'AUDIT RIGHTS', false));
children.push(bodyText('Contractor shall have the right, upon no less than 14 days\u2019 prior written notice and no more than once per calendar year, to audit Company\u2019s financial records solely for the purpose of verifying the accuracy of revenue share payments. Any audit shall be conducted at Contractor\u2019s expense by a mutually agreed-upon third party, during normal business hours, and in a manner that minimizes disruption to Company operations.'));

// ═══ SECTION 10: Termination ═══
children.push(sectionHeading(10, 'TERMINATION', false));
children.push(bodyText('Either party may terminate this Agreement upon written notice to the other party. Upon termination:'));
children.push(bulletItem('Contractor shall be paid for any earned but unpaid milestone payments as of the date of termination.'));
children.push(bulletItem('Revenue share rights shall be governed by Section 6 of this Agreement.'));
children.push(bulletItem('Sections 7 (Independent Contractor Status), 8 (Intellectual Property), 11 (Confidentiality), and 14 (Governing Law) shall survive termination.'));

// ═══ SECTION 11: Confidentiality ═══
children.push(sectionHeading(11, 'CONFIDENTIALITY', false));
children.push(bodyText('Contractor agrees to keep all non-public information relating to the Company, its business, technology, product, financials, and customers ("Confidential Information") strictly confidential and shall not disclose such information to any third party without the prior written consent of the Company. This obligation shall survive the termination of this Agreement for a period of three (3) years.'));
children.push(bodyText('Confidential Information does not include information that: (a) is or becomes publicly known through no breach by Contractor; (b) was rightfully known to Contractor prior to disclosure; or (c) is required to be disclosed by applicable law or court order, provided Contractor gives the Company prompt written notice.'));

// ═══ SECTION 12: Dispute Resolution ═══
children.push(sectionHeading(12, 'DISPUTE RESOLUTION', false));
children.push(bodyText('In the event of any dispute arising out of or relating to this Agreement, the parties agree to the following process:'));
children.push(subsectionHeading('12.1', 'Good Faith Negotiation', false));
children.push(bodyText('The parties shall first attempt to resolve the dispute through good faith negotiation within 15 days of written notice of the dispute.', false, true));
children.push(subsectionHeading('12.2', 'Mediation', false));
children.push(bodyText('If negotiation fails, either party may request non-binding mediation with a mutually agreed mediator, costs to be shared equally.', false, true));
children.push(subsectionHeading('12.3', 'Arbitration', false));
children.push(bodyText('If mediation fails or is declined, the dispute shall be resolved by binding arbitration in the Commonwealth of Virginia, under the rules of the American Arbitration Association. The decision of the arbitrator shall be final and enforceable in any court of competent jurisdiction.', false, true));

// ═══ SECTION 13: Entire Agreement ═══
children.push(sectionHeading(13, 'ENTIRE AGREEMENT', false));
children.push(bodyText('This Agreement represents the entire understanding between the parties with respect to its subject matter and supersedes all prior agreements, representations, and understandings, whether written or oral. This Agreement may only be modified by a written instrument signed by both parties.'));

// ═══ SECTION 14: Governing Law ═══
children.push(sectionHeading(14, 'GOVERNING LAW', false));
children.push(bodyText('This Agreement shall be governed by and construed in accordance with the laws of the Commonwealth of Virginia, without regard to its conflict of law provisions.'));

// ═══════════════════════════════════════════
// NEW SECTIONS (highlighted yellow)
// ═══════════════════════════════════════════

// ═══ SECTION 15: Acceptance & Approval ═══
children.push(sectionHeading(15, 'ACCEPTANCE & APPROVAL', true));
children.push(subsectionHeading('15.1', 'Review Period', true));
children.push(bodyText('Company shall have 10 business days from delivery of each milestone deliverable to review and provide written feedback. If no written objection is received within that period, the deliverable shall be deemed accepted and the corresponding milestone payment shall become due.', true, true));
children.push(subsectionHeading('15.2', 'Revision Requests', true));
children.push(bodyText('If Company provides written objection within the review period, Contractor shall address reasonable revisions that fall within the original scope of the deliverable. Company shall then have an additional 10 business days to review the revised deliverable. Requests for changes beyond the original scope shall be handled as change orders.', true, true));
children.push(subsectionHeading('15.3', 'Final Acceptance', true));
children.push(bodyText('Upon acceptance (whether express or deemed), the deliverable is considered complete for purposes of milestone payment. Post-acceptance changes are subject to the warranty period or treated as new scope.', true, true));

// ═══ SECTION 16: Client Responsibilities ═══
children.push(sectionHeading(16, 'CLIENT RESPONSIBILITIES', true));
children.push(subsectionHeading('16.1', 'Timely Cooperation', true));
children.push(bodyText('Company shall provide all necessary content, assets, credentials, access, and feedback within 5 business days of Contractor\u2019s request. Contractor shall not be held responsible for delays resulting from Company\u2019s failure to provide required materials or approvals in a timely manner.', true, true));
children.push(subsectionHeading('16.2', 'Timeline Impact', true));
children.push(bodyText('If Company delays exceed 5 business days on any request, the project timeline shall be extended by the duration of the delay at no additional cost to Company. Contractor shall notify Company in writing when a delay is impacting the schedule.', true, true));
children.push(subsectionHeading('16.3', 'Designated Point of Contact', true));
children.push(bodyText('Company shall designate a single point of contact with authority to provide approvals, feedback, and decisions on behalf of the Company. Changes to the designated contact shall be communicated in writing.', true, true));

// ═══ SECTION 17: Limitation of Liability ═══
children.push(sectionHeading(17, 'LIMITATION OF LIABILITY', true));
children.push(subsectionHeading('17.1', 'Liability Cap', true));
children.push(bodyText('Contractor\u2019s total aggregate liability under this Agreement, whether in contract, tort, or otherwise, shall not exceed the total amount actually paid by Company to Contractor under this Agreement as of the date the claim arises.', true, true));
children.push(subsectionHeading('17.2', 'Exclusion of Consequential Damages', true));
children.push(bodyText('In no event shall either party be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, revenue, data, or business opportunities, even if advised of the possibility of such damages.', true, true));
children.push(subsectionHeading('17.3', 'Warranty Period', true));
children.push(bodyText('Contractor warrants that delivered work will function substantially as described in the applicable milestone deliverable for a period of 60 days following acceptance. During this warranty period, Contractor shall correct any defects at no additional charge. After the warranty period expires, additional work shall be billed at the then-current rate or handled as a new engagement.', true, true));

// ═══ SECTION 18: Invoicing Process ═══
children.push(sectionHeading(18, 'INVOICING PROCESS', true));
children.push(subsectionHeading('18.1', 'Invoice Delivery', true));
children.push(bodyText('Contractor shall submit invoices to Company via email to the designated billing contact upon completion of each milestone deliverable or as otherwise specified in this Agreement. Each invoice shall include the milestone reference, amount due, and payment instructions.', true, true));
children.push(subsectionHeading('18.2', 'Payment Due Date', true));
children.push(bodyText('Payment is due within the net terms specified in this Agreement from the date of invoice. Company shall notify Contractor in writing within 5 business days of receipt if any invoice is disputed, specifying the nature of the dispute. Undisputed portions shall remain due on the original schedule.', true, true));

// ═══ SECTION 19: Indemnification ═══
children.push(sectionHeading(19, 'INDEMNIFICATION', true));
children.push(subsectionHeading('19.1', 'Company Indemnification', true));
children.push(bodyText('Company shall indemnify, defend, and hold harmless Contractor from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorney\u2019s fees) arising out of or related to: (a) Company\u2019s use of the delivered work product; (b) Company\u2019s relationships with its end users or customers; or (c) any content, data, or materials provided by Company that are incorporated into the work product.', true, true));
children.push(subsectionHeading('19.2', 'Contractor Indemnification', true));
children.push(bodyText('Contractor shall indemnify, defend, and hold harmless Company from and against any claims arising out of Contractor\u2019s willful misconduct or gross negligence in performing services under this Agreement, or any claim that the original work product (excluding Company-provided content and third-party components) infringes a third party\u2019s intellectual property rights.', true, true));

// ═══ SECTION 20: Force Majeure ═══
children.push(sectionHeading(20, 'FORCE MAJEURE', true));
children.push(bodyText('Neither party shall be liable for any failure or delay in performing its obligations under this Agreement if such failure or delay results from circumstances beyond the reasonable control of that party, including but not limited to: acts of God, natural disasters, pandemic or epidemic, government actions or orders, war or terrorism, labor disputes, utility or internet service disruptions, or serious illness or incapacity.', true));
children.push(bodyText('The affected party shall provide prompt written notice and use reasonable efforts to mitigate the impact. If a force majeure event continues for more than 60 consecutive days, either party may terminate this Agreement upon written notice without further obligation, except for payment of amounts earned prior to the event.', true));

// ═══ SECTION 21: Non-Solicitation ═══
children.push(sectionHeading(21, 'NON-SOLICITATION', true));
children.push(bodyText('During the term of this Agreement and for a period of 12 months following its termination, neither party shall directly solicit, recruit, or hire any employee, contractor, or consultant of the other party who was involved in the performance of this Agreement, without the prior written consent of the other party. This restriction shall not apply to individuals who respond to general public job postings or advertisements not specifically directed at the other party\u2019s personnel.', true));

// ═══ SECTION 22: Portfolio & Reference Rights ═══
children.push(sectionHeading(22, 'PORTFOLIO & REFERENCE RIGHTS', true));
children.push(bodyText('Contractor shall have the right to reference the project in Contractor\u2019s portfolio, website, marketing materials, and case studies, including the use of Company\u2019s name, logo, and general descriptions of the work performed. Contractor shall not disclose Confidential Information in any such materials. Company may request review of any portfolio materials prior to publication, and Contractor shall accommodate reasonable requests for modification. If Company requires that the engagement remain confidential, this must be specified in writing at the time of signing.', true));

// ═══ Signature block ═══
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 300 },
  children: [new TextRun({ text: 'IN WITNESS WHEREOF', bold: true, color: '1F3864', size: 24, font: 'Arial' })],
}));
children.push(bodyText('the parties have executed this Agreement as of the date first written above.'));
children.push(new Paragraph({ spacing: { after: 200 }, children: [] }));

children.push(new Table({
  width: { size: 9360, type: WidthType.DXA },
  columnWidths: [4320, 720, 4320],
  rows: [
    new TableRow({ children: [
      new TableCell({
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        width: { size: 4320, type: WidthType.DXA },
        shading: { fill: 'D6E4F0', type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'COMPANY', bold: true, color: '1F3864', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: 'Signature', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 120 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: '[Your Name]', size: 20, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Printed Name', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: '[Title]', size: 20, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Title', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 80 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: 'Date', size: 18, color: '999999', font: 'Arial' })] }),
        ],
      }),
      new TableCell({
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        width: { size: 720, type: WidthType.DXA },
        children: [new Paragraph({ children: [] })],
      }),
      new TableCell({
        borders: { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } },
        width: { size: 4320, type: WidthType.DXA },
        shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
        margins: { top: 160, bottom: 160, left: 200, right: 200 },
        children: [
          new Paragraph({ children: [new TextRun({ text: 'CONTRACTOR', bold: true, color: '1F3864', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 200 }, children: [] }),
          new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '999999' } }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: 'Signature', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: 'Martha Koepke', size: 20, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Printed Name', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: 'Practical Informatics, LLC', size: 20, font: 'Arial' })] }),
          new Paragraph({ children: [new TextRun({ text: 'Title / Entity', size: 18, color: '999999', font: 'Arial' })] }),
          new Paragraph({ spacing: { before: 80 }, children: [] }),
          new Paragraph({ children: [new TextRun({ text: 'Date', size: 18, color: '999999', font: 'Arial' })] }),
        ],
      }),
    ] }),
  ],
}));

// ── Create document ──
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Independent Contractor Agreement \u2014 Confidential', size: 16, color: '999999', font: 'Arial', italics: true })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 16, color: '999999', font: 'Arial' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '999999', font: 'Arial' }),
          ],
        })],
      }),
    },
    children,
  }],
});

const outputPath = path.join('C:', 'Users', 'marty', 'Downloads', 'DIS_LLC_Contract_Enhanced.docx');
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Contract generated: ' + outputPath);
});
