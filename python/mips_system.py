from pynq import DefaultIP
import re

class MIPSDriver():#DefaultIP):
    def __init__(self, description):
        self.data_memory = description.data_memory
        self.instruction_memory = description.instruction_memory
        #super().__init__(description=description)
        print("loaded!")

    #bindto = ['xilinx.com:ip:axi_bram_ctrl:4.1']

    def uploadData(self, data, offset = 0):
        for word in data:
            if(type(word) == int):
                self.data_memory.write(offset, word)
                offset += 4

    def readData(self, wordCount, offset = 0):
        output = []
        for i in range(offset, wordCount*4, 4):
            output.append(self.data_memory.read(i))
        return output
    
    def uploadByteCode(self, path, l=False):
        file = open(path, 'r')
        current_addr = 0
        for line in file:
            line = line.split(";")
            for befehl in line:
                befehl = befehl.strip(" ;\n")
                if re.search("^[01]+$", befehl):
                    if(l):
                        print(befehl)
                    befehl = int(befehl, 2)
                    self.instruction_memory.write(current_addr, befehl)
                    current_addr += 4
    def readByteCode(self, wordCount, offset = 0):
        output = []
        for i in range(offset, wordCount*4, 4):
            output.append(self.instruction_memory.read(i))
        return output
