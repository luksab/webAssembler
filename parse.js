
document.addEventListener("DOMContentLoaded", function () {
    let byteCodeEl = document.getElementById("byteCode");
    let assemblyEl = document.getElementById("assembly");
    byteCodeEl.value = assemble(assemblyEl.value);

    assemblyEl.addEventListener("input", () => {
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

function assemble(code) {
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
                    break;
            }
            //add $t0, $t1, $t2
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z])/im));
            if (!found) return "\t;no match";
            console.log("found", found[1], found[2], found[3])
            return "000000" + registerCodes[found[2]] + registerCodes[found[3]] + registerCodes[found[1]] + "00000" + func + comment;
        } else if (["lw", "sw"].includes(zeile.split(" ")[0].trim())) {
            switch (zeile.split(" ")[0]) {
                case 'lw':
                    opcode = "100011";
                    break;
                case 'sw':
                    opcode = "101011";
                    break;
                default:
                    break;
            }
            //sw $t5, 32($s2)
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]), +([0-9]+)\(\$([a-z]+[0-9a-zA-Z])\)/im));
            if (!found) return "\t;no match";
            console.log("found", found[1], found[2], found[3])
            return opcode + registerCodes[found[3]] + registerCodes[found[1]] + bin(found[2] | 0).padStart(16, '0') + comment;
        } else if (["beq", "addi"].includes(zeile.split(" ")[0].trim())) {
            switch (zeile.split(" ")[0]) {
                case 'addi':
                    opcode = "001000";
                    break;
                case 'beq':
                    opcode = "000100";
                    break;
                default:
                    break;
            }
            //addi $t5, $s2, 32
            //beq $s, $t, offset
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +\$([a-z]+[0-9a-zA-Z]) *, +([0-9]+)/im));
            if (!found) return "\t;no match";
            return opcode + registerCodes[found[2]] + registerCodes[found[1]] + bin(found[3] | 0).padStart(16, '0') + comment;
        } else if (zeile.split(" ")[0].trim() === "li") {
            //li $s, offset
            found = zeile.match(new RegExp(/\w+ +\$([a-z]+[0-9a-zA-Z]) *, +([0-9]+)/im));
            if (!found) return "\t;no match";
            return "001000" + registerCodes["zero"] + registerCodes[found[1]] + bin(found[2] | 0).padStart(16, '0') + comment + " (converted to addi)";
        } else if (zeile.split(" ")[0].trim() === "j") {
            found = zeile.match(new RegExp(/\w +([0-9]+)/im));
            if (!found) return "\t;no match";
            if ((found | 0) > 67108863 || (found | 0) < 0) return "\t;adress not valid";
            return "000010" + bin(found[1] | 0).padStart(26, '0') + comment;
        } else if (zeile.split(" ")[0].trim().slice(0,5) === "break") {
            return "111111" + bin(0).padStart(26, '0') + comment;
        }
        else if (zeile.trim().length > 0) return "\t;unknown instruction";
        else return "";
    })
    return code.join("\n")
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
