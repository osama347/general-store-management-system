/**
 * Receipt PDF Generator
 * Generates professional receipts for sales transactions
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReceiptData {
  sale_id: number;
  sale_date: string;
  total_amount: number;
  status: string;
  customer: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
  };
  staff?: {
    full_name: string;
    email?: string;
  };
  location?: {
    name: string;
    address?: string;
  };
  items: Array<{
    product_name: string;
    sku?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

export class ReceiptGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private margin: number;
  private currentY: number;

  constructor() {
    // Use smaller page size for receipt (80mm width like thermal printers)
    // But we'll use A4 for compatibility with standard printers
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.margin = 15;
    this.currentY = this.margin;
  }

  /**
   * Generate a receipt PDF
   */
  public generateReceipt(receipt: ReceiptData): jsPDF {
    this.reset();
    this.addHeader(receipt);
    this.addCustomerInfo(receipt);
    this.addItemsTable(receipt);
    this.addTotals(receipt);
    this.addFooter();
    return this.doc;
  }

  /**
   * Generate and download receipt
   */
  public downloadReceipt(receipt: ReceiptData, filename?: string): void {
    const pdf = this.generateReceipt(receipt);
    const name = filename || `Receipt_${receipt.sale_id}_${new Date().getTime()}.pdf`;
    pdf.save(name);
  }

  /**
   * Generate and open in new tab
   */
  public printReceipt(receipt: ReceiptData): void {
    const pdf = this.generateReceipt(receipt);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  private reset() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.margin = 15;
    this.currentY = this.margin;
  }

  private addHeader(receipt: ReceiptData) {
    // Company/Store name
    this.doc.setFontSize(18);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('General Store', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Location info
    if (receipt.location) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(receipt.location.name, this.pageWidth / 2, this.currentY, { align: 'center' });
      this.currentY += 5;
      
      if (receipt.location.address) {
        this.doc.setFontSize(9);
        this.doc.text(receipt.location.address, this.pageWidth / 2, this.currentY, { align: 'center' });
        this.currentY += 5;
      }
    }

    this.currentY += 3;

    // Receipt title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('SALES RECEIPT', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Receipt details
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const receiptDate = new Date(receipt.sale_date);
    const formattedDate = receiptDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.doc.text(`Receipt #: ${receipt.sale_id}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Date: ${formattedDate}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Status: ${receipt.status}`, this.margin, this.currentY);
    this.currentY += 8;

    // Separator line
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  private addCustomerInfo(receipt: ReceiptData) {
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('CUSTOMER INFORMATION', this.margin, this.currentY);
    this.currentY += 6;

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    const customerName = `${receipt.customer.first_name} ${receipt.customer.last_name}`;
    this.doc.text(`Name: ${customerName}`, this.margin + 5, this.currentY);
    this.currentY += 5;

    if (receipt.customer.phone) {
      this.doc.text(`Phone: ${receipt.customer.phone}`, this.margin + 5, this.currentY);
      this.currentY += 5;
    }

    if (receipt.customer.email) {
      this.doc.text(`Email: ${receipt.customer.email}`, this.margin + 5, this.currentY);
      this.currentY += 5;
    }

    // Staff info
    if (receipt.staff) {
      this.currentY += 3;
      this.doc.setFontSize(9);
      this.doc.setTextColor(100, 100, 100);
      this.doc.text(`Served by: ${receipt.staff.full_name}`, this.margin + 5, this.currentY);
      this.doc.setTextColor(0, 0, 0);
      this.currentY += 5;
    }

    this.currentY += 3;
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  private addItemsTable(receipt: ReceiptData) {
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('ITEMS', this.margin, this.currentY);
    this.currentY += 6;

    // Prepare table data
    const tableData = receipt.items.map(item => [
      item.product_name + (item.sku ? ` (${item.sku})` : ''),
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total_price.toFixed(2)}`
    ]);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Product', 'Qty', 'Price', 'Total']],
      body: tableData,
      margin: { left: this.margin, right: this.margin },
      styles: { 
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Product name
        1: { cellWidth: 20, halign: 'center' }, // Quantity
        2: { cellWidth: 30, halign: 'right' }, // Price
        3: { cellWidth: 35, halign: 'right' } // Total
      },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    // @ts-ignore - autoTable adds finalY to doc
    this.currentY = this.doc.lastAutoTable.finalY + 8;
  }

  private addTotals(receipt: ReceiptData) {
    const rightAlign = this.pageWidth - this.margin;
    const labelX = rightAlign - 50;
    const valueX = rightAlign;

    // Separator line before totals
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;

    // Subtotal (in this simple version, same as total)
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', labelX, this.currentY);
    this.doc.text(`$${receipt.total_amount.toFixed(2)}`, valueX, this.currentY, { align: 'right' });
    this.currentY += 6;

    // Tax (placeholder - you can calculate this based on your tax rate)
    // this.doc.text('Tax (0%):', labelX, this.currentY);
    // this.doc.text('$0.00', valueX, this.currentY, { align: 'right' });
    // this.currentY += 6;

    // Total
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TOTAL:', labelX, this.currentY);
    this.doc.text(`$${receipt.total_amount.toFixed(2)}`, valueX, this.currentY, { align: 'right' });
    this.currentY += 10;

    // Separator line after totals
    this.doc.setDrawColor(200, 200, 200);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY += 8;
  }

  private addFooter() {
    this.currentY += 5;

    // Thank you message
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Thank you for your business!', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 8;

    // Additional info
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('Please keep this receipt for your records.', this.pageWidth / 2, this.currentY, { align: 'center' });
    this.currentY += 4;
    this.doc.text('For questions or concerns, please contact us.', this.pageWidth / 2, this.currentY, { align: 'center' });
    
    // Generated timestamp
    this.currentY += 10;
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    const timestamp = new Date().toLocaleString();
    this.doc.text(`Generated: ${timestamp}`, this.pageWidth / 2, this.currentY, { align: 'center' });
    
    this.doc.setTextColor(0, 0, 0);
  }
}

// Export singleton instance
export const receiptGenerator = new ReceiptGenerator();
