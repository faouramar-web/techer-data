import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  HeadingLevel,
  HeightRule,
  ImageRun
} from 'docx';
import { TeacherSubmission, calculateRowEligiblePercent } from '../types';
import { getLogoUint8Array } from './schoolLogoBase64';

function base64ToUint8Array(base64: string): Uint8Array {
  const pureBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
  const binaryString = atob(pureBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateWordDocx(submission: TeacherSubmission): Promise<Blob> {
  const thinBorder = {
    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
  };

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  // Header Table (3 columns: Right Hebrew, Center School info & phone, Left Arabic)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorder,
    rows: [
      new TableRow({
        children: [
          // Left Arabic
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: 'بلدية المغار', bold: true, size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: 'الشاملة أ على اسم قاسم غانم', bold: true, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: 'بإشراف وزارة المعارف والثقافة', size: 16 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({ text: 'ص.ب. 873 المغار - 20128', size: 16 }),
                ],
              }),
            ],
          }),
          // Center School Emblem Original Logo Image
          new TableCell({
            width: { size: 34, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: getLogoUint8Array(),
                    transformation: {
                      width: 130,
                      height: 95,
                    },
                    type: 'png',
                  }),
                ],
              }),
            ],
          }),
          // Right Hebrew
          new TableCell({
            width: { size: 33, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.TOP,
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'עיריית מעאר', bold: true, size: 20 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'מקיף א\' ע"ש קאסם גאנם', bold: true, size: 18 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'בפיקוח משרד החינוך והתרבות', size: 16 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'ת.ד. 873 מג\'אר מי. 20128', size: 16 }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Table Column widths in percent (Total 100%)
  // From Right to Left:
  // 1: מס' (.1) -> 4%
  // 2: מקצוע -> 16%
  // 3: כיתה/קבוצה -> 12%
  // 4: מס' תלמידים -> 8%
  // 5: סמל שאלון -> 11%
  // 6: בחינה חיצונית 70% -> 10%
  // 7: בחינה בית ספרית 30% -> 10%
  // 8: פרויקט -> 9%
  // 9: מספר יח"ל של השאלון/הפרויקט -> 8%
  // 10: מתוך -> 6%
  // 11: זכאי לגמול % -> 6%
  // Sum = 4 + 16 + 12 + 8 + 11 + 10 + 10 + 9 + 8 + 6 + 6 = 100%

  const colWidths = [6, 6, 8, 9, 10, 10, 11, 8, 12, 16, 4]; // Word table order from left to right in RTL

  // Table header rows
  // Header Row 1: with spans
  const headerRow1 = new TableRow({
    children: [
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'זכאי לגמול %', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'מתוך', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'מספר יח"ל של השאלון/הפרויקט', bold: true, size: 16 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'פרויקט', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'בחינה בית ספרית 30%', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'בחינה חיצונית 70%', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'סמל שאלון', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "מס' תלמידים", bold: true, size: 16 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'כיתה/קבוצה', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'מקצוע', bold: true, size: 17 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        rowSpan: 2,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '', size: 17 })] })],
      }),
    ],
  });

  // Header Row 2: Sub-headers for bonuses
  const headerRow2 = new TableRow({
    children: [
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'גמול ב %', bold: true, size: 16 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'גמול ב %', bold: true, size: 16 })] })],
      }),
      new TableCell({
        borders: thinBorder,
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'גמול ב %', bold: true, size: 16 })] })],
      }),
    ],
  });

  // Prepare at least 10 data rows, or all rows if teacher has more
  const rowCount = Math.max(10, submission.rows?.length || 10);
  const dataRows: TableRow[] = [];
  for (let i = 1; i <= rowCount; i++) {
    const rowData = submission.rows.find((r) => r.rowNum === i) || {
      rowNum: i,
      subject: '',
      gradeGroup: '',
      studentsCount: '',
      questionnaireCode: '',
      externalExamBonus: '',
      schoolExamBonus: '',
      projectBonus: '',
      unitsCount: '',
      outOfUnits: '',
      eligibleBonusPercent: '',
    };

    dataRows.push(
      new TableRow({
        height: { value: 450, rule: HeightRule.ATLEAST },
        children: [
          // Left to right cell order (matching header)
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.eligibleBonusPercent || calculateRowEligiblePercent(rowData) || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.outOfUnits || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.unitsCount || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.projectBonus || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.schoolExamBonus || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.externalExamBonus || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.questionnaireCode || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.studentsCount || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rowData.gradeGroup || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: rowData.subject || '', size: 18 })] })],
          }),
          new TableCell({
            borders: thinBorder,
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `.${i}`, bold: true, size: 18 })] })],
          }),
        ],
      })
    );
  }

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: thinBorder,
    rows: [headerRow1, headerRow2, ...dataRows],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          headerTable,
          new Paragraph({
            border: {
              bottom: { color: '000000', size: 6, style: BorderStyle.SINGLE, space: 4 },
            },
            spacing: { after: 140 },
          }),
          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 100, after: 60 },
            children: [
              new TextRun({
                text: `הודעה על זכאות לגמול הכנה לבגרות לשנה"ל ${(submission.schoolYear || 'תשפ"ז').split(' ')[0]}`,
                bold: true,
                size: 26,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 180 },
            children: [
              new TextRun({
                text: 'בית ספר מקיף א\' ע"ש קאסם גאנם מגאר',
                bold: true,
                size: 24,
              }),
            ],
          }),
          // Teacher Info Row
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 140 },
            children: [
              new TextRun({ text: 'שם המורה: ', bold: true, size: 22 }),
              new TextRun({ text: `${submission.teacherName || '____________________'}         `, underline: {}, size: 22 }),
              new TextRun({ text: 'תעודת זהות: ', bold: true, size: 22 }),
              new TextRun({ text: `${submission.teacherId || '____________________'}`, underline: {}, size: 22 }),
            ],
          }),
          // Subtitle
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: 'להלן סמלי שאלוני הבגרות שהתלמידים ניגשים אליהן בשנה"ל הנוכחית:',
                bold: true,
                underline: {},
                size: 20,
              }),
            ],
          }),
          // The 10-row questionnaire table
          mainTable,
          // Footer
          new Paragraph({ spacing: { before: 200 } }),
          // Teacher signature line
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'חתימת המורה: ', bold: true, size: 20 }),
              ...(submission.teacherSignature && submission.teacherSignature.startsWith('data:image/')
                ? [
                    new ImageRun({
                      data: base64ToUint8Array(submission.teacherSignature),
                      transformation: { width: 120, height: 40 },
                      type: 'png',
                    }),
                    new TextRun({ text: `  (${submission.teacherName})      `, bold: true, size: 20 }),
                  ]
                : [
                    new TextRun({
                      text: `${
                        submission.teacherSignature
                          ? (submission.teacherSignature.includes('חתימה גרפית') || submission.teacherSignature.includes('דיגיטלית')
                              ? `${submission.teacherName} (חתימה מאושרת)`
                              : submission.teacherSignature)
                          : (submission.teacherName || '_______________________')
                      }     `,
                      size: 20,
                    }),
                  ]),
              new TextRun({ text: 'תאריך: ', bold: true, size: 20 }),
              new TextRun({ text: `${submission.submissionDate || '__________________'}`, size: 20 }),
            ],
          }),
          // Municipality Payroll authorized approval line
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 120 },
            children: [
              new TextRun({ text: 'אישור מחלקת שכר: הריני לאשר את נכונות הנתונים וזכאות הגמול .     ', bold: true, size: 20 }),
              new TextRun({ text: 'חתימת מורשה שכר: ', bold: true, size: 20 }),
              new TextRun({ text: `${submission.principalSignature || '_______________________'}     `, size: 20 }),
              new TextRun({ text: 'תאריך: ', bold: true, size: 20 }),
              new TextRun({ text: `${submission.principalApprovalDate || '__________________'}`, size: 20 }),
            ],
          }),
          // Final bonus percent line
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'לשימוש המאשר : זכאי לגמול של : ', bold: true, size: 20 }),
              new TextRun({ text: `${submission.approvedBonusPercent || '___________________'}`, bold: true, size: 20 }),
              new TextRun({ text: ' אחוזים', bold: true, size: 20 }),
            ],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}
