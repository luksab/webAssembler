
document.addEventListener("DOMContentLoaded", function () {
    let byteCodeEl = document.getElementById("byteCode");
    let assemblyEl = document.getElementById("assembly");

    assemblyEl.addEventListener("input", () => {
        byteCodeEl.value = assemble(assemblyEl.value);
    });

    document.getElementById("DelayFill").addEventListener("click", () => {
        byteCodeEl.value = assemble(assemblyEl.value);
    });

    document.getElementById("NOPFill").addEventListener("click", () => {
        //add $zero, $zero, $zero
        nop = document.getElementById("NOPFill").checked ? "00000000000000000000000000100000;" : "";
        byteCodeEl.value = assemble(assemblyEl.value);
    });

    document.getElementById("saveBtn").addEventListener("click", () => {
        localStorage.setItem('code', assemblyEl.value);
    });
    if (localStorage.getItem('backup'))
        assemblyEl.value = localStorage.getItem('backup');
    byteCodeEl.value = assemble(localStorage.getItem('backup'));
    document.getElementById("loadBtn").addEventListener("click", () => {
        assemblyEl.value = localStorage.getItem('code');
        byteCodeEl.value = assemble(localStorage.getItem('code'));
    });

    window.addEventListener("beforeunload", () => {
        localStorage.setItem('backup', assemblyEl.value);
    });

    document.getElementById("downloadBtn").addEventListener('click', () => {
        download("bytecode.bc", byteCodeEl.value);
    })

})

function bin(inp) {
    return (~inp + 1 >>> 0).toString(2);
    return inp.toString(2);
}


const registerCodes = {
    "zero": "00000",
    "at": "00001",
    "v0": "00010",
    "v1": "00011",
    "a0": "00100",
    "a1": "00101",
    "a2": "00110",
    "a3": "00111",
    "t0": "01000",
    "t1": "01001",
    "t2": "01010",
    "t3": "01011",
    "t4": "01100",
    "t5": "01101",
    "t6": "01110",
    "t7": "01111",
    "s0": "10000",
    "s1": "10001",
    "s2": "10010",
    "s3": "10011",
    "s4": "10100",
    "s5": "10101",
    "s6": "10110",
    "s7": "10111",
    "t8": "11000",
    "t9": "11001",
    "k0": "11010",
    "k1": "11011",
    "gp": "11100",
    "sp": "11101",
    "fp": "11110",
    "ra": "11111",
};

const includeNopsAfter = {
    "add": 0,
    "sub": 0,
    "and": 0,
    "or": 0,
    "nor": 0,
    "lw": 0,
    "sw": 0,
    "beq": 2,
    "addi": 0,
    "j": 1,
    "break": 0,
};

let dontUseReg = {
    "zero": 0,
    "at": 0,
    "v0": 0,
    "v1": 0,
    "a0": 0,
    "a1": 0,
    "a2": 0,
    "a3": 0,
    "t0": 0,
    "t1": 0,
    "t2": 0,
    "t3": 0,
    "t4": 0,
    "t5": 0,
    "t6": 0,
    "t7": 0,
    "s0": 0,
    "s1": 0,
    "s2": 0,
    "s3": 0,
    "s4": 0,
    "s5": 0,
    "s6": 0,
    "s7": 0,
    "t8": 0,
    "t9": 0,
    "k0": 0,
    "k1": 0,
    "gp": 0,
    "sp": 0,
    "fp": 0,
    "ra": 0,
};

let nop = "";

function decNOPs(times) {
    // console.error(times, "times")
    for (const reg in dontUseReg) {
        if (dontUseReg.hasOwnProperty(reg)) {
            dontUseReg[reg] = (dontUseReg[reg] - times < 0) ? 0 : dontUseReg[reg] - times;
        }
    }
    return times > 0 ? nop.repeat(times) : "";
}

function getNOPs() {
    //console.log(dontUseReg)
    //console.log(([...arguments]).map(reg => dontUseReg[reg]));
    // console.log([...arguments])
    // console.log([...arguments].map(num => dontUseReg[num]))
    // console.log(Math.max(...[...arguments].map(num => dontUseReg[num])));
    //console.log(Math.max(([...arguments]).map(reg => dontUseReg[reg])), "nops");
    return decNOPs(Math.max(...([...arguments].map(reg => dontUseReg[reg]))));
}

function setDontUse(regiser, times) {
    dontUseReg[regiser] = Math.max(dontUseReg[regiser], times);
}

function assemble(code) {
    decNOPs(10);
    let opcode;
    code = code.split("\n");
    code = code.map(zeile => {
        let found;
        let comment = zeile.match(new RegExp(/[#;]([\s\S]*)/im));
        if (comment) comment = ";\t" + comment[1].trim();
        else comment = ";";
        zeile = zeile.toLowerCase();
        if (["add", "sub", "and", "or", "nor"].includes(zeile.split(" ")[0].trim())) {
            console.log(zeile)
            let func;
            switch (zeile.split(" ")[0]) {
                case 'add':
                    func = "100000";
                    break;
                case 'sub':
                    func = "100010";
                    break;
                case 'and':
                    func = "100100";
                    break;
                case 'or':
                    func = "101000";
                    break;
                case 'nor':
                    func = "100111";
                    break;
                default:
                    return "something broke :/";
            }
            //add $t0, $t1, $t2
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z])/im));
            if (!found) return "\t;no match, syntax: op $dst, $r1, $r2";
            console.log("found", found[1], found[2], found[3])
            let nops = getNOPs(found[2], found[3]);
            setDontUse(found[1], 3);
            decNOPs(1);
            return nops + "000000" + registerCodes[found[2]] + registerCodes[found[3]] + registerCodes[found[1]] + "00000" + func + comment;
        } else if (["lw", "sw"].includes(zeile.split(" ")[0].trim())) {
            //sw $t5, 32($s2)
            let nops;
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]), +(-?[0-9]+)\(\$([a-z]+[0-9a-zA-Z])\)/im));
            if (!found) return "\t;no match, syntax: op $data, offset($addr)";
            switch (zeile.split(" ")[0]) {
                case 'lw':
                    nops = getNOPs(found[3]);
                    setDontUse(found[1], 3);
                    opcode = "100011";
                    break;
                case 'sw':
                    nops = getNOPs(found[1], found[3]);
                    opcode = "101011";
                    break;
                default:
                    return "something broke :/";
            }
            console.log("found", found[1], found[2], found[3])
            decNOPs(1);
            return nops + opcode + registerCodes[found[3]] + registerCodes[found[1]] + twosComplement(found[2], 16) + comment;
        } else if (["beq", "addi"].includes(zeile.split(" ")[0].trim())) {
            //addi $t5, $s2, 32
            //beq $s, $t, offset
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z]) *, +(-?[0-9]+)/im));
            if (!found) return "\t;no match, syntax: op $r0, $r1, offset";
            let nops;
            let delay = "";
            switch (zeile.split(" ")[0]) {
                case 'addi':
                    nops = getNOPs(found[2]);
                    opcode = "001000";
                    setDontUse(found[1], 3);
                    break;
                case 'beq':
                    nops = getNOPs(found[1], found[2]);
                    opcode = "000100";
                    if (document.getElementById("DelayFill").checked)
                        delay = ";" + nop.repeat(3);
                    break;
                default:
                    return "something broke :/";
            }
            decNOPs(1);
            return nops + opcode + registerCodes[found[2]] + registerCodes[found[1]] + twosComplement(found[3], 16) + comment + delay;
        } else if (zeile.split(" ")[0].trim() === "li") {
            //li $s, offset
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +(-?[0-9]+)/im));
            if (!found) return "\t;no match, syntax: li $dst, number";
            setDontUse(found[1], 3);
            decNOPs(1);
            return "001000" + registerCodes["zero"] + registerCodes[found[1]] + twosComplement(found[2], 16) + comment + " (converted to addi)";
        } else if (zeile.split(" ")[0].trim() === "j") {
            found = zeile.match(new RegExp(/\w +([0-9]+)/im));
            if (!found) return "\t;no match, syntax: j address";
            if ((found | 0) > 67108863 || (found | 0) < 0) return "\t;adress not valid";
            return "000010" + twosComplement(found[1], 26) + comment + nop;
        } else if (zeile.split(" ")[0].trim().slice(0, 5) === "break") {
            return "111111" + twosComplement(0, 26) + comment;
        }
        else if (zeile.trim().length > 0) return "\t;unknown instruction";
        else return "";
    })
    return code.filter(e => e).join("\n")
}

function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}
