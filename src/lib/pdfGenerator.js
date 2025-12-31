import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { supabase } from '@/lib/supabaseClient.js';

async function fetchCompanyProfile() {
  const { data, error } = await supabase
    .from('company_profile')
    .select('official_letterhead_pdf_url, company_name') 
    .limit(1) 
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error('Error fetching company profile:', error);
    throw new Error('Gagal memuat profil perusahaan: ' + error.message);
  }
  if (!data || !data.official_letterhead_pdf_url) {
    throw new Error('URL PDF kop surat belum diatur di profil perusahaan. Harap hubungi Admin.');
  }
  return data;
}

export const generateLeaveRequestPdf = async (leaveRequest) => {
  try {
    const companyProfile = await fetchCompanyProfile();
    const letterheadPdfUrl = companyProfile.official_letterhead_pdf_url;

    const existingPdfBytes = await fetch(letterheadPdfUrl).then(res => res.arrayBuffer());
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; 
    const { width, height } = firstPage.getSize();

    const formatDate = (dateString) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'long', year: 'numeric'
      });
    };

    const drawText = (text, x, y, options = {}) => {
      firstPage.drawText(text || '-', {
        x,
        y,
        font: options.font || font,
        size: options.size || 10,
        color: options.color || rgb(0, 0, 0),
        lineHeight: options.lineHeight || 12,
        maxWidth: options.maxWidth,
      });
    };

    const employee = leaveRequest.employees || {};
    const leaveType = leaveRequest.leave_types || {};
    
    const startDate = formatDate(leaveRequest.start_date);
    const endDate = formatDate(leaveRequest.end_date);
    const requestDate = formatDate(leaveRequest.requested_at);
    const leaveDuration = calculateLeaveDuration(leaveRequest.start_date, leaveRequest.end_date);

    const contentStartY = height - 180; 
    const leftMargin = 70;
    const valueXOffset = 200; 


    drawText('FORMULIR PERMOHONAN CUTI KARYAWAN', leftMargin, contentStartY + 20, { font: boldFont, size: 14, color: rgb(0.1, 0.1, 0.1) });
    
    let currentY = contentStartY - 15;
    drawText('DATA KARYAWAN', leftMargin, currentY, { font: boldFont, size: 11 });
    currentY -= 15;
    drawText('Nomor Surat Cuti', leftMargin, currentY);
    drawText(`: ${leaveRequest.leave_request_number || 'Belum ada'}`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Tanggal Surat Cuti', leftMargin, currentY);
    drawText(`: ${requestDate}`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Nama Lengkap', leftMargin, currentY);
    drawText(`: ${employee.name || 'N/A'}`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Divisi / Bagian / Unit Kerja', leftMargin, currentY);
    drawText(`: ${employee.division || 'N/A'}`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Jabatan', leftMargin, currentY);
    drawText(`: ${employee.position || 'N/A'}`, leftMargin + valueXOffset, currentY);
    
    currentY -= 25;
    drawText('KETERANGAN CUTI', leftMargin, currentY, { font: boldFont, size: 11 });
    currentY -= 15;
    drawText('Jenis Cuti', leftMargin, currentY);
    drawText(`: ${leaveType.name || 'N/A'}`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Lama Cuti Dijalankan', leftMargin, currentY);
    drawText(`: ${startDate} s/d ${endDate} (${leaveDuration} hari kerja)`, leftMargin + valueXOffset, currentY);
    currentY -= 15;
    
    const addressDuringLeave = employee.address || "Sesuai alamat KTP"; 
    const phoneDuringLeave = employee.phone || "Sesuai nomor telepon terdaftar";
    
    drawText('Alamat Selama Cuti', leftMargin, currentY);
    firstPage.drawText(`: ${addressDuringLeave}`, {
      x: leftMargin + valueXOffset,
      y: currentY,
      font: font,
      size: 10,
      color: rgb(0,0,0),
      lineHeight: 12,
      maxWidth: width - (leftMargin + valueXOffset) - 30,
    });
    const addressLines = Math.ceil((addressDuringLeave || '-').length / 45); 
    currentY -= (addressLines * 12) + 3;


    drawText('No. Telepon Selama Cuti', leftMargin, currentY);
    drawText(`: ${phoneDuringLeave}`, leftMargin + valueXOffset, currentY);
    
    currentY -= 15;
    drawText('Keterangan / Alasan', leftMargin, currentY);
    firstPage.drawText(`: ${leaveRequest.reason || '-'}`, {
      x: leftMargin + valueXOffset,
      y: currentY,
      font: font,
      size: 10,
      color: rgb(0,0,0),
      lineHeight: 12,
      maxWidth: width - (leftMargin + valueXOffset) - 30,
    });
    const reasonLines = Math.ceil((leaveRequest.reason || '-').length / 45); 
    currentY -= (reasonLines * 12) + 3;

    currentY -= 15;
    drawText('Status Pengajuan', leftMargin, currentY);
    drawText(`: ${leaveRequest.status || 'N/A'}`, leftMargin + valueXOffset, currentY, { font: boldFont });


    currentY -= 25;
    drawText('SELAMA CUTI TUGAS DIGANTIKAN OLEH', leftMargin, currentY, { font: boldFont, size: 11 });
    currentY -= 15;
    drawText('Nama Lengkap', leftMargin, currentY);
    drawText(': .....................................................................', leftMargin + valueXOffset, currentY);
    currentY -= 15;
    drawText('Tanda Tangan', leftMargin, currentY);
    drawText(': ..........................', leftMargin + valueXOffset, currentY);
    
    currentY -= 40;
    const todayJakarta = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    drawText(`Jakarta, ${todayJakarta}`, leftMargin, currentY);
    
    currentY -= 15;
    const signatureBlockY = currentY;
    const signatureBlockWidth = (width - (leftMargin * 2)) / 3;
    
    drawText('Pemohon Cuti,', leftMargin, signatureBlockY, {size: 10});
    drawText(employee.name || '(..............................)', leftMargin, signatureBlockY - 50, {size: 10});
    
    const atasanX = leftMargin + signatureBlockWidth;
    drawText('Persetujuan Atasan,', atasanX, signatureBlockY, {size: 10});
    drawText('(..............................)', atasanX, signatureBlockY - 50, {size: 10});
    
    const hrdX = leftMargin + signatureBlockWidth * 2;
    drawText('HRD,', hrdX, signatureBlockY, {size: 10});
    drawText('(..............................)', hrdX, signatureBlockY - 50, {size: 10});

    currentY = signatureBlockY - 80;
    drawText('CATATAN DARI HRD', leftMargin, currentY, { font: boldFont, size: 11 });
    firstPage.drawRectangle({
        x: leftMargin - 5,
        y: currentY - 55,
        width: width - (leftMargin * 2) + 10,
        height: 50,
        borderColor: rgb(0,0,0),
        borderWidth: 0.5,
    });

    currentY -= 75;
    drawText('Perhatian:', leftMargin, currentY, { font: boldFont, size: 10 });
    currentY -= 12;
    drawText('1. Surat permohonan cuti ini harus diajukan minimal 1 minggu sebelum cuti dijalankan.', leftMargin + 10, currentY, {size: 9});
    currentY -= 12;
    drawText('2. Sebelum ada persetujuan dari atasan, tidak diperkenankan untuk meninggalkan/mendahului cuti,', leftMargin + 10, currentY, {size: 9});
    currentY -= 10;
    drawText('   kecuali sakit dengan dibuktikan dengan surat keterangan dokter atau karena keperluan yang mendesak.', leftMargin + 10, currentY, {size: 9});


    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const fileName = `Surat_Cuti_${employee.name ? employee.name.replace(/\s/g, '_') : 'Karyawan'}_${leaveRequest.leave_request_number || 'NoSurat'}.pdf`;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error; 
  }
};


function calculateLeaveDuration(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const sDate = new Date(startDateStr);
  const eDate = new Date(endDateStr);
  let duration = 0;
  let currentDate = new Date(sDate);
  while (currentDate <= eDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
      duration++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return duration;
}