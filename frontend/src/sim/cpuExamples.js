export const CPU_EXAMPLES={
    sum:{
        title:"Sum of 1 to N",
        memory:[],
        source:`; Adds 5 + 4 + 3 + 2 + 1 and stores the total in memory 10
    MOV R1, #5        ; counter
    MOV R2, #0        ; running total
loop:
    ADD R2, R2, R1
    SUB R1, R1, #1    ; sets Z when the counter reaches 0
    JNZ loop
    STORE R2, 10
    HALT`
    },
    max:{
        title:"Largest of two numbers",
        memory:[23, 41],
        source:`; Memory 0 and 1 hold the inputs. The larger goes to memory 2
    LOAD R1, 0
    LOAD R2, 1
    CMP R1, R2        ; R1 - R2, sets N if R1 is smaller
    JN second
    STORE R1, 2
    HALT
second:
    STORE R2, 2
    HALT`
    },
    multiply:{
        title:"Multiply by repeated addition",
        memory:[6, 7],
        source:`; Memory 2 = memory 0 x memory 1
    LOAD R1, 0
    LOAD R2, 1
    MOV R3, #0
loop:
    CMP R2, #0
    JZ done
    ADD R3, R3, R1
    SUB R2, R2, #1
    JMP loop
done:
    STORE R3, 2
    HALT`
    },
    array:{
        title:"Sum an array with a pointer",
        memory:[4, 8, 15, 16, 23, 42],
        source:`; Adds the six values in memory 0 to 5 using indirect addressing
    MOV R1, #0        ; pointer
    MOV R2, #6        ; items left
    MOV R3, #0        ; total
loop:
    LOAD R4, [R1]
    ADD R3, R3, R4
    ADD R1, R1, #1
    SUB R2, R2, #1
    JNZ loop
    STORE R3, 20
    HALT`
    }
};
