import saintsData from './saints-data.json';
import { getLiturgicalColor } from './getLiturgicalColor';

export const generateSaintsICS = () => {
  const saints = saintsData.saints;
  const year = new Date().getFullYear();
  
  // Header
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cotidie//Saints Calendar//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Santoral Católico',
    'X-WR-TIMEZONE:UTC',
  ].join('\r\n');

  // Events
  saints.forEach((saint, index) => {
    // Determine color
    const colorHex = getLiturgicalColor({
        title: saint.title,
        type: saint.type,
        name: saint.name
    });
    
    // Map hex to Google Calendar Color ID (approximate)
    // 1: Lavender (#7986cb), 2: Sage (#33b679), 3: Grape (#8e24aa), 4: Flamingo (#e67c73), 
    // 5: Banana (#f6bf26), 6: Tangerine (#f4511e), 7: Peacock (#039be5), 8: Graphite (#616161), 
    // 9: Blueberry (#3f51b5), 10: Basil (#0b8043), 11: Tomato (#d50000)
    
    let colorId = '8'; // Default Graphite
    let category = 'Saint';

    // Check colorHex or type/title logic directly if hex is CSS var
    // Note: getLiturgicalColor might return "hsl(var(--card))" or hex.
    
    const lowerTitle = (saint.title || '').toLowerCase();
    const lowerType = (saint.type || '').toLowerCase();
    const lowerName = (saint.name || '').toLowerCase();

    // Re-evaluating based on logic similar to getLiturgicalColor but for ICS mapping
    if (lowerTitle.includes('solemnidad') || lowerName.includes('señor') || lowerTitle.includes('fiesta del señor')) {
         colorId = '5'; // Banana/Gold
         category = 'Solemnidad';
    } else if (lowerType.includes('martyr') || lowerType.includes('mártir') || lowerType.includes('apostle')) {
         colorId = '11'; // Tomato/Red
         category = 'Martir';
    } else if (lowerType.includes('marian')) {
         colorId = '9'; // Blueberry/Blue (closest to Marian blue)
         category = 'Mariana';
    } else if (lowerType.includes('virgin') || lowerType.includes('virgen')) {
         colorId = '10'; // Basil/Green (requested Green for virgins)
         category = 'Virgen';
    } else if (lowerType.includes('pope') || lowerType.includes('bishop') || lowerType.includes('doctor')) {
         colorId = '8'; // White/Grey -> Graphite (or maybe 1 Lavender/Purple for Bishop?)
         if (lowerType.includes('pope')) colorId = '3'; // Grape/Purple
         category = 'Confesor';
    } else {
         colorId = '10'; // Green default
    }

    // Format Date: YYYYMMDD
    const month = saint.month.toString().padStart(2, '0');
    const day = saint.day.toString().padStart(2, '0');
    const dtStart = `${year}${month}${day}`;
    
    // Escape text fields
    const summary = (saint.name || 'Santo del día').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const description = `${saint.title || ''}\\n\\n${saint.bio || ''}`.replace(/,/g, '\\,').replace(/;/g, '\\;');
    
    const event = [
      'BEGIN:VEVENT',
      `UID:cotidie-saint-${month}-${day}@benjamin.studio`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `RRULE:FREQ=YEARLY`, // Repeats every year
      `CATEGORIES:${category}`,
      `X-GOOGLE-CALENDAR-CONTENT-DISPLAY:chip`, 
      `X-GOOGLE-CALENDAR-CONTENT-ICON:https://cotidie.app/icon.png`, // Hypothetical
      `COLOR:${colorId}`, // Non-standard but some clients read it
      `X-APPLE-CALENDAR-COLOR:${colorId}`,
      'END:VEVENT'
    ].join('\r\n');
    
    icsContent += '\r\n' + event;
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};
