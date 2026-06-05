import saintsData from './saints-data.json';

export const generateSaintsICS = (semester?: 1 | 2) => {
  let saints = saintsData.saints;
  const year = new Date().getFullYear();
  let calName = 'Santoral Católico';

  if (semester === 1) {
    saints = saints.filter((saint) => saint.month <= 6);
    calName += ' (Ene-Jun)';
  } else if (semester === 2) {
    saints = saints.filter((saint) => saint.month >= 7);
    calName += ' (Jul-Dic)';
  }

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cotidie//Saints Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:UTC',
  ].join('\r\n');

  saints.forEach((saint) => {
    let category = 'Saint';
    let hexColor = '#616161';

    const lowerTitle = (saint.title || '').toLowerCase();
    const lowerType = (saint.type || '').toLowerCase();
    const lowerName = (saint.name || '').toLowerCase();

    if (lowerTitle.includes('solemnidad') || lowerName.includes('señor') || lowerTitle.includes('fiesta del señor')) {
      category = 'Solemnidad';
      hexColor = '#f6bf26';
    } else if (lowerType.includes('martyr') || lowerType.includes('mártir') || lowerType.includes('apostle')) {
      category = 'Martir';
      hexColor = '#d50000';
    } else if (lowerType.includes('marian')) {
      category = 'Mariana';
      hexColor = '#3f51b5';
    } else if (lowerType.includes('virgin') || lowerType.includes('virgen')) {
      category = 'Virgen';
      hexColor = '#0b8043';
    } else if (lowerType.includes('pope') || lowerType.includes('bishop') || lowerType.includes('doctor')) {
      category = 'Confesor';
      hexColor = lowerType.includes('pope') ? '#8e24aa' : '#616161';
    } else {
      hexColor = '#0b8043';
    }

    const month = saint.month.toString().padStart(2, '0');
    const day = saint.day.toString().padStart(2, '0');
    const dtStart = `${year}${month}${day}`;

    const summary = (saint.name || 'Santo del día').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const description = `${saint.title || ''}\n\n${saint.bio || ''}`.replace(/,/g, '\\,').replace(/;/g, '\\;');

    const event = [
      'BEGIN:VEVENT',
      `UID:cotidie-saint-${month}-${day}@benjamin.studio`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'RRULE:FREQ=YEARLY',
      `CATEGORIES:${category}`,
      'X-GOOGLE-CALENDAR-CONTENT-DISPLAY:chip',
      'X-GOOGLE-CALENDAR-CONTENT-ICON:https://cotidie.app/icon.png',
      `COLOR:${hexColor}`,
      `X-APPLE-CALENDAR-COLOR:${hexColor}`,
      'END:VEVENT',
    ].join('\r\n');

    icsContent += '\r\n' + event;
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};
