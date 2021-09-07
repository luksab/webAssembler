"use strict";
let fillDelay = true;
let fillNops = true;
let byteCodeEl = document.getElementById("byteCode");
let cleanAssemblyEl = document.getElementById("cleanAssembly");
let assemblyEl = document.getElementById("assembly");

function reassemble() {
    cleanAssemblyEl.value = assembler(assemble(assemblyEl.value));
    byteCodeEl.value = byteCode(assemble(assemblyEl.value));
}

document.addEventListener("DOMContentLoaded", function () {
    //equal scrolling for cleanAssembly and byteCode
    cleanAssemblyEl.addEventListener("scroll", () => setTimeout(() => byteCodeEl.scrollTop = cleanAssemblyEl.scrollTop, 200))
    byteCodeEl.addEventListener("scroll", () => setTimeout(() => cleanAssemblyEl.scrollTop = byteCodeEl.scrollTop, 200))

    document.getElementById("useBinCleanAssembler").addEventListener("change", reassemble);
    document.getElementById("bcUseHex").addEventListener("change", reassemble);
    assemblyEl.addEventListener("input", reassemble);

    document.getElementById("DelayFill").addEventListener("click", () => {
        fillDelay = document.getElementById("DelayFill").checked;
        reassemble();
    });

    document.getElementById("NOPFill").addEventListener("click", () => {
        //add $zero, $zero, $zero
        fillNops = document.getElementById("NOPFill").checked;
        reassemble()
    });

    document.getElementById("saveBtn").addEventListener("click", () => {
        localStorage.setItem('code', assemblyEl.value);
    });
    if (localStorage.getItem('backup')) {
        assemblyEl.value = localStorage.getItem('backup');
        cleanAssemblyEl.value = assembler(assemble(localStorage.getItem('backup')));
        byteCodeEl.value = byteCode(assemble(localStorage.getItem('backup')));
    }

    document.getElementById("loadBtn").addEventListener("click", () => {
        assemblyEl.value = localStorage.getItem('code');
        cleanAssemblyEl.value = assembler(assemble(localStorage.getItem('code')));
        byteCodeEl.value = byteCode(assemble(localStorage.getItem('code')));
    });

    window.addEventListener("beforeunload", () => {
        localStorage.setItem('backup', assemblyEl.value);
    });

    document.getElementById("downloadBtn").addEventListener('click', () => {
        download("bytecode.bc", byteCode(assemble(assemblyEl.value), true));
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

const RformatFunc = { add: "100000", sub: "100010", and: "100100", or: "101000", nor: "100111", sll: "000000", srl: "000010", sra: "000011" };

let nop = "00000000000000000000000000100000;";

function decNOPs(times) {
    // console.error(times, "times")
    for (const reg in dontUseReg) {
        if (dontUseReg.hasOwnProperty(reg)) {
            dontUseReg[reg] = (dontUseReg[reg] - times < 0) ? 0 : dontUseReg[reg] - times;
        }
    }
    //return times > 0 ? nop.repeat(times) : "";
    return times > 0 ? new Array(times).fill({ op: "nop", registers: [] }) : [];
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
    let labelLookup = {};
    code = code.split("\n");
    let regexes = [new RegExp(/^(?<label>\w+)\s*:\s*$/m),//only Label
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)(?:\s*[;#]\s*(?<comment>.*))?$/im),//break
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)\s+(?:(?<offset>(?:\w+|-?[0-9])))\s*(?:[;#]\s*(?<comment>.*))?$/im),//zero reg
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)\s+(?:\$(?<reg0>[a-z]+[0-9]?)),\s*(?:(?<offset>(?:\w+|-?[0-9])))\s*(?:[;#]\s*(?<comment>.*))?$/im),//one reg
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)\s+(?:\$(?<reg0>[a-z]+[0-9]?)),\s*(?:\$(?<reg1>[a-z]+[0-9]?)),\s*(?:(?<offset>(?:-?[0-9]+)|(\w+)))\s*(?:[;#]\s*(?<comment>.*))?$/im),//two reg
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)\s+(?:\$(?<reg0>[a-z]+[0-9a-zA-Z])),\s*(?<offset>[0-9]+)\((?:\$(?<reg1>[a-z]+[0-9a-zA-Z]))\)\s*(?:[;#]\s*(?<comment>.*))?/im),//zero reg offset
    new RegExp(/^\s*(?:(?<label>(?:\w|[0-9])+)\s*:)?\s*(?<op>\w+)\s+(?:\$(?<reg0>[a-z]+[0-9]?)),\s*(?:\$(?<reg1>[a-z]+[0-9]?)),\s*(?:\$(?<reg2>[a-z]+[0-9]?))\s*(?:[;#]\s*(?<comment>.*))?$/im),//three reg
    ];

    let probablyAssembler = new RegExp(/^(\w+:)?(li|add|sub|and|or|nor|lw|sw|addi|beq|j|break)\s*\$?\w*,?.*(;(.*))?$/m);

    //map the string to an object, like
    //{[optional, if error]error:{}, op: string, registers: [string], [optional]offset: number or string,
    // [optional, if R-Format]func: binString}
    //and create label lookup
    code = code.map((string, i) => {
        let zeile = regexes.map(r => string.match(r)).filter(s => s);
        if (zeile.length === 0) {
            if (string.match(probablyAssembler))
                return { error: { length: zeile.length, zeile: zeile, message: "no match" } };
            return { error: { length: zeile.length, zeile: zeile, message: "no match", noAssembler: true } };
        }
        if (zeile.length > 1)
            return { error: { length: zeile.length, zeile: zeile, message: "more than one RegExp matched" } };
        zeile = zeile[0].groups;
        //if(zeile["label"])
        switch (zeile["op"]) {
            case "add": case "sub": case "and": case "or": case "nor"://op $dst, $r1, $r2
                return { op: zeile["op"], registers: [zeile["reg0"], zeile["reg1"], zeile["reg2"]], func: RformatFunc[zeile["op"]], label: zeile["label"], comment: zeile["comment"] };
            case "lw": case "sw":/*op $data, offset($addr)*/case "beq": case "addi":/*op $s, $t, offset*/
                return { op: zeile["op"], registers: [zeile["reg0"], zeile["reg1"]], offset: zeile["offset"], label: zeile["label"], comment: zeile["comment"] };
            case "j":
                return { op: zeile["op"], registers: [zeile["reg0"]], offset: zeile["offset"], label: zeile["label"], comment: zeile["comment"] };
            case "break":
                return { op: zeile["op"], registers: [], label: zeile["label"], comment: zeile["comment"] };
            case "sll": case "srl": case "sra":
                return { op: zeile["op"], registers: [zeile["reg0"], zeile["reg1"]], offset: zeile["offset"], func: RformatFunc[zeile["op"]], label: zeile["label"], comment: zeile["comment"] };
            case "li":
                return { op: "addi", registers: [zeile["reg0"], "zero"], offset: zeile["offset"], label: zeile["label"], comment: zeile["comment"] };
            case "bgt":
                return { op: "bgt", registers: [zeile["reg0"], zeile["reg1"]], offset: zeile["offset"], label: zeile["label"], comment: zeile["comment"] };
            case "nop":
                return { op: "nop", registers: [], label: zeile["label"], comment: zeile["comment"] };
            case undefined:
                return { error: { length: zeile.length, zeile: zeile, message: "only label", label: true }, label: zeile["label"] };
            default:
                return { error: { length: zeile.length, zeile: zeile, message: "object parsing failed" }, label: zeile["label"] };
        }
    });
    console.log("1:", code)

    const oldCode = code;
    code = [];
    oldCode.forEach(zeile => {//insert nops
        if (zeile.error && zeile.error.noAssembler)
            return;
        switch (zeile["op"]) {
            case "add": case "sub": case "and": case "or": case "nor"://op $dst, $r1, $r2
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[1], zeile.registers[2]));
                decNOPs(1);
                setDontUse(zeile.registers[0], 3);
                code.push(zeile);
                break;
            case "sll": case "srl": case "sra":
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[1]));
                decNOPs(1);
                setDontUse(zeile.registers[0], 3);
                code.push(zeile);
                break;
            case "lw":
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[1]));
                decNOPs(1);
                setDontUse(zeile.registers[0], 3);
                code.push(zeile);
                break;
            case "sw":/*op $data, offset($addr)*/
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[0], zeile.registers[1]));
                decNOPs(1);
                code.push(zeile);
                break;
            case "beq":
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[0], zeile.registers[1]));
                decNOPs(1);
                code.push(zeile);
                decNOPs(3);
                if (fillDelay)
                    code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                break;
            case "j":
                decNOPs(1);
                code.push(zeile);
                decNOPs(1);
                if (fillDelay)
                    code.push(...new Array(1).fill({ op: "nop", registers: [] }));
                break;
            case "addi":/*op $s, $t, offset*/
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[1]));
                decNOPs(1);
                setDontUse(zeile.registers[0], 3);
                code.push(zeile);
                break;
            case "break":
                decNOPs(1);
                code.push(zeile);
                decNOPs(1);
                code.push(...new Array(1).fill({ op: "nop", registers: [] }));
                break;
            case "nop":
                //decNOPs(1);
                code.push(zeile);
                break;
            case "bgt":
                if (fillNops)
                    code.push(...getNOPs(zeile.registers[0], zeile.registers[1]));
                decNOPs(5);
                code.push({ op: "addi", registers: ["at", "zero"], offset: "1", label: undefined, comment: "load 1" });
                code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                code.push({ op: "sll", registers: ["at", "at"], offset: "31", func: RformatFunc["sll"], label: undefined, comment: "make 0b1000..." });
                code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                code.push({ op: "sub", registers: [zeile.registers[0], zeile.registers[1], zeile.registers[0]], func: RformatFunc["sub"], label: undefined, comment: undefined });
                code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                code.push({ op: "and", registers: ["at", "at", zeile.registers[0]], func: RformatFunc["and"], label: undefined, comment: "is negative" });
                code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                code.push({ op: "beq", registers: ["at", "zero"], offset: zeile.offset, label: undefined, comment: zeile.comment });
                if (fillDelay)
                    code.push(...new Array(3).fill({ op: "nop", registers: [] }));
                break;
            default:
                if (zeile.error && (zeile.error.label || zeile.error.label))
                    code.push(zeile);
                break;
        }
    });
    console.log(code)
    let i = 0;
    code.forEach((zeile, i) => {
        labelLookup[zeile["label"]] = i;
        if (zeile["op"])
            i++;
    });
    console.log(labelLookup)
    code.forEach(zeile => {
        if (isNaN(zeile["offset"]))
            zeile["offset"] = labelLookup[zeile["offset"]];
    })
    return code;
}

function byteCode(code, clean) {
    code = code.map(zeile => {//convert to byteCode
        if (zeile.error && zeile.label)
            return "";
        if (zeile.error)
            return zeile.error.message;
        let ret = "";
        switch (zeile["op"]) {
            case "add": case "sub": case "and": case "or": case "nor"://op $dst, $r1, $r2
                ret += "000000" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[2]] + registerCodes[zeile.registers[0]] + "00000" + zeile.func;
                break;
            case "sll": case "srl": case "sra":
                ret += "000000" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[0]] + twosComplement(zeile.offset, 5) + zeile.func;
                break;
            case "lw":
                ret += "100011" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[0]] + twosComplement(zeile.offset, 16);
                break;
            case "sw":/*op $data, offset($addr)*/
                ret += "101011" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[0]] + twosComplement(zeile.offset, 16)
                break;
            case "beq":
                ret += "000100" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[0]] + twosComplement(zeile.offset, 16);
                break;
            case "addi":/*op $s, $t, offset*/
                ret += "001000" + registerCodes[zeile.registers[1]] + registerCodes[zeile.registers[0]] + twosComplement(zeile.offset, 16);
                break;
            case "j":
                if ((zeile.offset | 0) > 67108863 || (zeile.offset | 0) < 0) return "\t;adress not valid";
                ret += "000010" + twosComplement(zeile.offset, 26);
                break;
            case "break":
                ret += "111111" + twosComplement(0, 26) + ";";
                break;
            case "nop":
                ret += "00000000000000000000000000100000"
                break;
            default:
                return { error: { length: zeile.length, zeile: zeile, message: "converting to byteCode failed" } };
        }
        if (clean)
            return ret + ";";
        if (document.getElementById("bcUseHex").checked)
            return parseInt(ret.split(";")[0], 2).toString(16).padStart(8, "0") + "; " + (zeile.comment || "");
        return ret + "; " + (zeile.comment || "");
    });
    code = code.map(zeile => {
        return typeof zeile === "string" ? zeile : JSON.stringify(zeile);
    })
    return code.filter(e => e).join("\n")
}

function assembler(code) {
    code = code.map((zeile, i) => {//convert to byteCode
        let ret = zeile.label ? zeile.label + ": " : "";
        ret += "" + (i + 1) + ": ";
        if (zeile.error && zeile.label)
            return zeile.label + ":";
        if (zeile.error)
            return zeile.error.message;
        const useBin = document.getElementById("useBinCleanAssembler").checked;
        switch (zeile["op"]) {
            case "add": case "sub": case "and": case "or": case "nor"://op $dst, $r1, $r2
                ret += zeile.op + " $" + zeile.registers[0] + ", $" + zeile.registers[1] + ", $" + zeile.registers[2];
                break;
            case "sll": case "srl": case "sra":
                ret += zeile.op + " $" + zeile.registers[0] + ", $" + zeile.registers[1] + ", " + (useBin ? twosComplement(zeile.offset, 5) : zeile.offset);
                break;
            case "lw":
                ret += zeile.op + " $" + zeile.registers[0] + ", " + (useBin ? twosComplement(zeile.offset, 16) : zeile.offset) + "($" + zeile.registers[1] + ")";
                break;
            case "sw":/*op $data, offset($addr)*/
                ret += zeile.op + " $" + zeile.registers[0] + ", " + (useBin ? twosComplement(zeile.offset, 16) : zeile.offset) + "($" + zeile.registers[1] + ")";
                break;
            case "beq":
                ret += zeile.op + " $" + zeile.registers[0] + ", $" + zeile.registers[1] + ", " + (useBin ? twosComplement(zeile.offset, 16) : zeile.offset);
                break;
            case "addi":/*op $s, $t, offset*/
                ret += zeile.op + " $" + zeile.registers[0] + ", $" + zeile.registers[1] + ", " + (useBin ? twosComplement(zeile.offset, 16) : zeile.offset);
                break;
            case "j":
                if ((zeile.offset | 0) > 67108863 || (zeile.offset | 0) < 0) return "\t;adress not valid";
                ret += zeile.op + " " + (useBin ? twosComplement(zeile.offset, 26) : zeile.offset);
                break;
            case "break":
                ret += zeile.op;
                break;
            case "nop":
                ret += "nop"
                break;
            default:
                return { error: { length: zeile.length, zeile: zeile, message: "converting to byteCode failed" } };
        }
        return ret + "; " + (zeile.comment || "");
    });
    code = code.map(zeile => {
        return typeof zeile === "string" ? zeile : JSON.stringify(zeile);
    })
    return code.filter(e => true).join("\n")
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
