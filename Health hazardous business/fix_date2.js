const fs = require('fs');
let content = fs.readFileSync('รหัส.js', 'utf8');

const oldFunc2 = `    function formatThaiDate(dateStr) {
      if(!dateStr || dateStr === '-') return {d:'', m:'', y:'', full:''};
      let parts = dateStr.split('T')[0].split('-');
      if(parts.length < 3 && dateStr.includes('/')) {
        parts = dateStr.split('/');
        if(parts.length === 3) {
          let y = parts[2].length === 4 ? parts[2] : (parseInt(parts[2])+2500).toString();
          return { d: parseInt(parts[0]).toString(), m: getThaiMonth(parseInt(parts[1])), y: y, full: parseInt(parts[0]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + y };
        }
      }
      if(parts.length === 3) {
        return { d: parseInt(parts[2]).toString(), m: getThaiMonth(parseInt(parts[1])), y: (parseInt(parts[0])+543).toString(), full: parseInt(parts[2]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + (parseInt(parts[0])+543) };
      }
      return {d:'', m:'', y:'', full:''};
    }`;

const newFunc2 = `    function formatThaiDate(dateStr) {
      if(!dateStr || dateStr === '-') return {d:'', m:'', y:'', full:''};
      let parts = dateStr.split('T')[0].split('-');
      if(parts.length < 3 && dateStr.includes('/')) {
        parts = dateStr.split('/');
        if(parts.length === 3) {
          let yStr = parts[2];
          let yNum = parseInt(yStr, 10);
          if (yStr.length !== 4) yNum += 2500;
          if (yNum < 2500) yNum += 543;
          let y = yNum.toString();
          return { d: parseInt(parts[0]).toString(), m: getThaiMonth(parseInt(parts[1])), y: y, full: parseInt(parts[0]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + y };
        }
      }
      if(parts.length === 3) {
        let yNum = parseInt(parts[0], 10);
        if (yNum < 2500) yNum += 543;
        let y = yNum.toString();
        return { d: parseInt(parts[2]).toString(), m: getThaiMonth(parseInt(parts[1])), y: y, full: parseInt(parts[2]) + ' ' + getThaiMonth(parseInt(parts[1])) + ' ' + y };
      }
      return {d:'', m:'', y:'', full:''};
    }`;

if (content.includes(oldFunc2)) {
    content = content.replace(oldFunc2, newFunc2);
    fs.writeFileSync('รหัส_update2.js', content);
    console.log("Updated formatThaiDate second occurrence");
} else {
    console.log("oldFunc not found anymore.");
}
