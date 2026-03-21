import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const BLUE = '#1F3864'
const LIGHT_BLUE = '#D6E4F0'
const LIGHT_GRAY = '#F2F2F2'
const BORDER = '#CCCCCC'

const s = StyleSheet.create({
  page: { padding: 50, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a1a' },
  // Title
  titleCenter: { textAlign: 'center' as const, marginBottom: 4 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: BLUE },
  subtitle: { fontSize: 12, color: BLUE, marginBottom: 20 },
  // Parties table
  partiesRow: { flexDirection: 'row', marginBottom: 20 },
  partyCell: { flex: 1, padding: 12, borderWidth: 0.5, borderColor: BORDER },
  partyLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 4 },
  partyName: { fontSize: 9 },
  partyDetail: { fontSize: 8, color: '#666', marginTop: 2 },
  // Sections
  sectionHeader: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: BLUE, marginTop: 16, marginBottom: 6 },
  subsectionHeader: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#333', marginTop: 8, marginBottom: 4, marginLeft: 12 },
  body: { fontSize: 9.5, lineHeight: 1.6, color: '#333', marginBottom: 6 },
  bodyIndent: { fontSize: 9.5, lineHeight: 1.6, color: '#333', marginBottom: 6, marginLeft: 12 },
  bullet: { fontSize: 9.5, lineHeight: 1.6, color: '#333', marginLeft: 16, marginBottom: 2 },
  // Tables
  table: { marginTop: 6, marginBottom: 8, borderWidth: 0.5, borderColor: BORDER },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: BLUE },
  tableHeaderCell: { padding: 6, fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', borderRightWidth: 0.5, borderRightColor: '#3a5a8a' },
  tableRow: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: BORDER },
  tableRowAlt: { flexDirection: 'row', borderTopWidth: 0.5, borderTopColor: BORDER, backgroundColor: LIGHT_GRAY },
  tableCell: { padding: 6, fontSize: 9, borderRightWidth: 0.5, borderRightColor: BORDER },
  tableCellBold: { padding: 6, fontSize: 9, fontFamily: 'Helvetica-Bold', borderRightWidth: 0.5, borderRightColor: BORDER },
  // Signature
  sigRow: { flexDirection: 'row', marginTop: 30 },
  sigCell: { flex: 1, padding: 16 },
  sigLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: BLUE, marginBottom: 16 },
  sigLine: { borderBottomWidth: 0.5, borderBottomColor: '#999', height: 24, marginBottom: 4 },
  sigCaption: { fontSize: 8, color: '#999', marginBottom: 8 },
  sigName: { fontSize: 9, marginBottom: 2 },
  // Footer
  footer: { position: 'absolute' as const, bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#999' },
  divider: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 12 },
})

export interface ContractPdfData {
  company: {
    name: string
    contactName: string
    email: string
    phone?: string
    address?: string
    state?: string
  }
  contractor: {
    name: string
    email: string
    state: string
    address?: string
  }
  project: string
  agreementDate: string
  sections: {
    number: number
    title: string
    content: string
    subsections: { id: string; title: string; content: string }[]
  }[]
  milestones: { title: string; amount: number; trigger: string }[]
  milestoneTotal: number
  scopeInItems: string[]
  scopeOutItems: string[]
  changeOrderPolicy?: string
  revenuePhases: { name: string; percentage: number; duration: string }[]
  revenueCap?: number
  paymentTerms: string
}

function dateLabel(val: string | null) {
  if (!val) return '_______________'
  return new Date(val + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function ContractPdfDocument(data: ContractPdfData) {
  const MANAGED = ['scope_of_work', 'cash_compensation', 'revenue_share', 'performance_accelerator', 'revenue_share_cap']

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* Title */}
        <View style={s.titleCenter}>
          <Text style={s.title}>INDEPENDENT CONTRACTOR AGREEMENT</Text>
        </View>
        <View style={s.titleCenter}>
          <Text style={s.subtitle}>Revenue Share + Milestone Compensation</Text>
        </View>

        <Text style={s.body}>
          This Independent Contractor Agreement (&quot;Agreement&quot;) is entered into as of {dateLabel(data.agreementDate)}, by and between:
        </Text>

        {/* Parties table */}
        <View style={s.partiesRow}>
          <View style={[s.partyCell, { backgroundColor: LIGHT_BLUE }]}>
            <Text style={s.partyLabel}>Company</Text>
            <Text style={s.partyName}>{data.company.name}</Text>
            {data.company.address && <Text style={s.partyDetail}>{data.company.address}</Text>}
            {data.company.state && <Text style={s.partyDetail}>a {data.company.state} company</Text>}
            {data.company.email && <Text style={s.partyDetail}>{data.company.email}</Text>}
          </View>
          <View style={[s.partyCell, { backgroundColor: LIGHT_GRAY }]}>
            <Text style={s.partyLabel}>Contractor</Text>
            <Text style={s.partyName}>{data.contractor.name}</Text>
            {data.contractor.address && <Text style={s.partyDetail}>{data.contractor.address}</Text>}
            {data.contractor.state && <Text style={s.partyDetail}>a {data.contractor.state} company</Text>}
            <Text style={s.partyDetail}>{data.contractor.email}</Text>
          </View>
        </View>

        {/* Render each section */}
        {data.sections.map((section) => {
          // Section 1: Scope — render with bullet items
          if (section.number === 1 && data.scopeInItems.length > 0) {
            return (
              <View key={section.number}>
                <Text style={s.sectionHeader}>{section.number}. {section.title.toUpperCase()}</Text>
                <Text style={s.body}>{section.content}</Text>
                {data.scopeInItems.map((item, i) => (
                  <Text key={i} style={s.bullet}>{'\u2022'}  {item}</Text>
                ))}
                {data.scopeOutItems.length > 0 && (
                  <View style={{ marginTop: 6 }}>
                    <Text style={[s.body, { fontFamily: 'Helvetica-Oblique', color: '#666' }]}>
                      Out of scope: {data.scopeOutItems.join(', ')}
                    </Text>
                  </View>
                )}
                {data.changeOrderPolicy && (
                  <Text style={[s.body, { fontFamily: 'Helvetica-Oblique', color: '#666', marginTop: 4 }]}>
                    Change orders: {data.changeOrderPolicy}
                  </Text>
                )}
              </View>
            )
          }

          // Section 2: Cash Compensation — render milestone table
          if (section.number === 2 && data.milestones.length > 0) {
            return (
              <View key={section.number}>
                <Text style={s.sectionHeader}>{section.number}. {section.title.toUpperCase()}</Text>
                <Text style={s.body}>{section.content}</Text>
                <View style={s.table}>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderCell, { width: '25%' }]}>Installment</Text>
                    <Text style={[s.tableHeaderCell, { width: '30%' }]}>Amount</Text>
                    <Text style={[s.tableHeaderCell, { width: '45%', borderRightWidth: 0 }]}>Trigger</Text>
                  </View>
                  {data.milestones.map((m, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <Text style={[s.tableCell, { width: '25%' }]}>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</Text>
                      <Text style={[s.tableCellBold, { width: '30%' }]}>${m.amount.toLocaleString()}</Text>
                      <Text style={[s.tableCell, { width: '45%', borderRightWidth: 0 }]}>{m.trigger || 'TBD'}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[s.body, { fontFamily: 'Helvetica-Bold' }]}>
                  Total: ${data.milestoneTotal.toLocaleString()}
                </Text>
              </View>
            )
          }

          // Section 4: Performance Accelerator — render phase table
          if (section.number === 4 && data.revenuePhases.length > 0) {
            return (
              <View key={section.number}>
                <Text style={s.sectionHeader}>{section.number}. {section.title.toUpperCase()}</Text>
                <Text style={s.body}>{section.content}</Text>
                <View style={s.table}>
                  <View style={s.tableHeaderRow}>
                    <Text style={[s.tableHeaderCell, { width: '50%' }]}>Period</Text>
                    <Text style={[s.tableHeaderCell, { width: '50%', borderRightWidth: 0 }]}>Revenue Share Rate</Text>
                  </View>
                  {data.revenuePhases.map((p, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
                      <Text style={[s.tableCell, { width: '50%' }]}>{p.name} ({p.duration})</Text>
                      <Text style={[s.tableCellBold, { width: '50%', borderRightWidth: 0 }]}>{p.percentage}% of Gross Revenue</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          }

          // Section 5: Revenue Share Cap — inject actual cap
          if (section.number === 5 && data.revenueCap) {
            return (
              <View key={section.number}>
                <Text style={s.sectionHeader}>{section.number}. {section.title.toUpperCase()}</Text>
                <Text style={s.body}>
                  Total cumulative payments under Sections 3 and 4 shall be capped at ${data.revenueCap.toLocaleString()}. Upon reaching this cap, all revenue share obligations shall terminate, and no further payments shall be owed under those sections.
                </Text>
              </View>
            )
          }

          // Standard section
          return (
            <View key={section.number} wrap={false}>
              <Text style={s.sectionHeader}>{section.number}. {section.title.toUpperCase()}</Text>
              {section.content ? <Text style={s.body}>{section.content}</Text> : null}
              {section.subsections.map((sub) => (
                <View key={sub.id}>
                  <Text style={s.subsectionHeader}>{sub.id}. {sub.title}</Text>
                  <Text style={s.bodyIndent}>{sub.content}</Text>
                </View>
              ))}
            </View>
          )
        })}

        {/* Payment Terms summary */}
        <View style={s.divider} />
        <Text style={[s.body, { fontFamily: 'Helvetica-Bold' }]}>Payment Terms: {data.paymentTerms}</Text>

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text>Independent Contractor Agreement — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* Signature page */}
      <Page size="LETTER" style={s.page}>
        <View style={s.titleCenter}>
          <Text style={[s.title, { fontSize: 14, marginBottom: 8 }]}>IN WITNESS WHEREOF</Text>
          <Text style={s.body}>the parties have executed this Agreement as of the date first written above.</Text>
        </View>

        <View style={s.sigRow}>
          <View style={[s.sigCell, { backgroundColor: LIGHT_BLUE, borderRadius: 4, marginRight: 8 }]}>
            <Text style={s.sigLabel}>COMPANY</Text>
            <View style={s.sigLine} />
            <Text style={s.sigCaption}>Signature</Text>
            <Text style={s.sigName}>{'\n'}</Text>
            <Text style={s.sigCaption}>Printed Name</Text>
            <Text style={s.sigName}>{'\n'}</Text>
            <Text style={s.sigCaption}>Title</Text>
            <Text style={s.sigName}>{'\n'}</Text>
            <Text style={s.sigCaption}>Date</Text>
          </View>
          <View style={[s.sigCell, { backgroundColor: LIGHT_GRAY, borderRadius: 4 }]}>
            <Text style={s.sigLabel}>CONTRACTOR</Text>
            <View style={s.sigLine} />
            <Text style={s.sigCaption}>Signature</Text>
            <Text style={s.sigName}>{data.contractor.name}</Text>
            <Text style={s.sigCaption}>Printed Name / Entity</Text>
            <Text style={s.sigName}>{'\n'}</Text>
            <Text style={s.sigCaption}>Title</Text>
            <Text style={s.sigName}>{'\n'}</Text>
            <Text style={s.sigCaption}>Date</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Independent Contractor Agreement — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
