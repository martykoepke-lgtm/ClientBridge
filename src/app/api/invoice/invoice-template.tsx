import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a2e' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  brandSub: { fontSize: 8, color: '#666', marginTop: 2 },
  invoiceTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#1a1a2e', textAlign: 'right' as const },
  invoiceNumber: { fontSize: 9, color: '#666', textAlign: 'right' as const, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#e0e0e0', marginVertical: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginBottom: 8, color: '#333' },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase' as const, marginBottom: 2 },
  value: { fontSize: 10, color: '#1a1a2e' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingBottom: 4, marginBottom: 4 },
  tableHeaderCell: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#666', textTransform: 'uppercase' as const },
  tableRow: { flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tableCell: { fontSize: 9, color: '#333' },
  summaryBox: { backgroundColor: '#f5f5ff', borderRadius: 4, padding: 12, marginTop: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#ccc' },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a1a2e' },
  footer: { position: 'absolute' as const, bottom: 30, left: 40, right: 40, textAlign: 'center' as const, fontSize: 8, color: '#999' },
})

interface MilestoneInvoiceData {
  invoiceNumber: string
  date: string
  projectName: string
  clientName: string
  clientCompany: string
  clientEmail: string
  billingType: string
  totalAmount: number
  dateRange: string
  milestone: {
    title: string
    description: string | null
    amount: number
    scopeItems: { label: string; complete: boolean }[]
  }
  paymentTerms: string | null
}

export function MilestoneInvoiceDocument(data: MilestoneInvoiceData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Practical Informatics</Text>
            <Text style={styles.brandSub}>Software Development Services</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.invoiceNumber}>{data.date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & Project Info */}
        <View style={[styles.row, { marginBottom: 20 }]}>
          <View>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{data.clientName}</Text>
            {data.clientCompany ? <Text style={styles.value}>{data.clientCompany}</Text> : null}
            {data.clientEmail ? <Text style={[styles.value, { color: '#666' }]}>{data.clientEmail}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' as const }}>
            <Text style={styles.label}>Project</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{data.projectName}</Text>
            <Text style={[styles.value, { color: '#666' }]}>Milestone Payment</Text>
            <Text style={[styles.value, { color: '#666' }]}>{data.dateRange}</Text>
          </View>
        </View>

        {/* Milestone details */}
        <Text style={styles.sectionTitle}>Milestone: {data.milestone.title}</Text>
        {data.milestone.description && (
          <Text style={[styles.value, { marginBottom: 10, color: '#555' }]}>{data.milestone.description}</Text>
        )}

        {/* Scope items delivered */}
        {data.milestone.scopeItems.length > 0 && (
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.label, { marginBottom: 6 }]}>Deliverables</Text>
            {data.milestone.scopeItems.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 3, paddingLeft: 8 }}>
                <Text style={[styles.tableCell, { width: 14 }]}>{item.complete ? '✓' : '○'}</Text>
                <Text style={[styles.tableCell, { color: item.complete ? '#333' : '#999' }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Due</Text>
          <Text style={styles.totalValue}>${data.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>

        {data.paymentTerms && (
          <Text style={[styles.value, { marginTop: 8, color: '#666' }]}>Terms: {data.paymentTerms}</Text>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Practical Informatics · Generated via ClientBridge · {data.date}
        </Text>
      </Page>
    </Document>
  )
}

interface InvoiceData {
  invoiceNumber: string
  date: string
  projectName: string
  clientName: string
  clientCompany: string
  clientEmail: string
  billingType: string
  rate: number
  totalHours: number
  totalAmount: number
  categories: { name: string; minutes: number; sessions: number }[]
  sessions: { date: string; category: string; hours: number; description: string }[]
  dateRange: string
}

export function InvoiceDocument(data: InvoiceData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>Practical Informatics</Text>
            <Text style={styles.brandSub}>Software Development Services</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{data.invoiceNumber}</Text>
            <Text style={styles.invoiceNumber}>{data.date}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Client & Project Info */}
        <View style={[styles.row, { marginBottom: 20 }]}>
          <View>
            <Text style={styles.label}>Bill To</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{data.clientName}</Text>
            {data.clientCompany ? <Text style={styles.value}>{data.clientCompany}</Text> : null}
            {data.clientEmail ? <Text style={[styles.value, { color: '#666' }]}>{data.clientEmail}</Text> : null}
          </View>
          <View style={{ alignItems: 'flex-end' as const }}>
            <Text style={styles.label}>Project</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{data.projectName}</Text>
            <Text style={[styles.value, { color: '#666' }]}>{data.dateRange}</Text>
            <Text style={[styles.value, { color: '#666', textTransform: 'capitalize' as const }]}>
              {data.billingType.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Category Summary */}
        <Text style={styles.sectionTitle}>Work Summary</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: '50%' }]}>Category</Text>
          <Text style={[styles.tableHeaderCell, { width: '20%', textAlign: 'right' as const }]}>Hours</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' as const }]}>Rate</Text>
          <Text style={[styles.tableHeaderCell, { width: '15%', textAlign: 'right' as const }]}>Amount</Text>
        </View>
        {data.categories.map((cat, i) => {
          const hours = cat.minutes / 60
          const amount = hours * data.rate
          return (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '50%' }]}>{cat.name} ({cat.sessions} sessions)</Text>
              <Text style={[styles.tableCell, { width: '20%', textAlign: 'right' as const }]}>{hours.toFixed(1)}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' as const }]}>${data.rate.toFixed(2)}</Text>
              <Text style={[styles.tableCell, { width: '15%', textAlign: 'right' as const }]}>${amount.toFixed(2)}</Text>
            </View>
          )
        })}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total ({data.totalHours.toFixed(1)} hours)</Text>
          <Text style={styles.totalValue}>${data.totalAmount.toFixed(2)}</Text>
        </View>

        {/* Session Detail */}
        {data.sessions.length > 0 && data.sessions.length <= 50 && (
          <View style={{ marginTop: 25 }}>
            <Text style={styles.sectionTitle}>Session Detail</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '12%' }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: '18%' }]}>Category</Text>
              <Text style={[styles.tableHeaderCell, { width: '10%', textAlign: 'right' as const }]}>Hours</Text>
              <Text style={[styles.tableHeaderCell, { width: '60%', paddingLeft: 8 }]}>Description</Text>
            </View>
            {data.sessions.map((s, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: '12%' }]}>{s.date}</Text>
                <Text style={[styles.tableCell, { width: '18%' }]}>{s.category}</Text>
                <Text style={[styles.tableCell, { width: '10%', textAlign: 'right' as const }]}>{s.hours.toFixed(1)}</Text>
                <Text style={[styles.tableCell, { width: '60%', paddingLeft: 8, color: '#666' }]}>{s.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Practical Informatics · Generated via ClientBridge · {data.date}
        </Text>
      </Page>
    </Document>
  )
}
