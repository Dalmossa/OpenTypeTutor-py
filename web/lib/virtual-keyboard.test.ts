import { describe, expect, it } from "vitest";

import {
  NUMPAD_LAYOUT,
  NUMPAD_SPANS,
  buildKeyboardModel,
  resolveAwaitedKey,
} from "@/lib/virtual-keyboard";

describe("NUMPAD_LAYOUT — RN38", () => {
  it("o ponto (NumDec) fica à direita do 6", () => {
    expect(NUMPAD_LAYOUT[2]).toEqual(["Num4", "Num5", "Num6", "NumDec"]);
  });

  it("o Enter ocupa os dois espaços à direita do 3 (span de 2 linhas)", () => {
    expect(NUMPAD_LAYOUT[3]).toEqual(["Num1", "Num2", "Num3", "NumEnter"]);
    expect(NUMPAD_SPANS.NumEnter).toEqual({ y: 2 });
  });

  it("o mais (+) ocupa uma célula à direita do 9 (sem sobrepor o ponto)", () => {
    expect(NUMPAD_LAYOUT[1]).toEqual(["Num7", "Num8", "Num9", "NumAdd"]);
    expect(NUMPAD_SPANS.NumAdd).toBeUndefined();
    const model = buildKeyboardModel("ABNT2");
    const add = model.numpad[1]?.[3];
    expect(add?.label).toBe("NumAdd");
    expect(add?.spanY).toBeUndefined();
    const dec = model.numpad[2]?.[3];
    expect(dec?.label).toBe("NumDec");
    expect(dec?.spanY).toBeUndefined();
  });

  it("o modelo construído reflete o layout com display de ponto", () => {
    const model = buildKeyboardModel("ABNT2");
    const dec = model.numpad[2]?.[3];
    expect(dec?.label).toBe("NumDec");
    expect(dec?.display).toBe(".");
    const enter = model.numpad[3]?.[3];
    expect(enter?.label).toBe("NumEnter");
    expect(enter?.spanY).toBe(2);
  });
});

describe("resolveAwaitedKey — RN39", () => {
  const abnt2 = buildKeyboardModel("ABNT2");
  const usIntl = buildKeyboardModel("US-INTERNATIONAL");

  it("espaço → núcleo de espaço (Space)", () => {
    expect(resolveAwaitedKey(" ", null, abnt2)).toBe("Space");
  });

  it("dígito → tecla do teclado numérico", () => {
    expect(resolveAwaitedKey("3", null, abnt2)).toBe("Num3");
    expect(resolveAwaitedKey("0", null, abnt2)).toBe("Num0");
  });

  it("ponto após um dígito → NumDec (decimal do numpad)", () => {
    expect(resolveAwaitedKey(".", "3", abnt2)).toBe("NumDec");
    expect(resolveAwaitedKey(",", "5", usIntl)).toBe("NumDec");
  });

  it("ponto sem dígito anterior → tecla principal", () => {
    expect(resolveAwaitedKey(".", "a", abnt2)).toBe(".");
  });

  it("letra → tecla principal", () => {
    expect(resolveAwaitedKey("a", null, abnt2)).toBe("a");
  });

  it("caractere acentuado → tecla base (tecla morta + tecla)", () => {
    expect(resolveAwaitedKey("é", null, abnt2)).toBe("e");
    expect(resolveAwaitedKey("ã", null, usIntl)).toBe("a");
  });

  it("ç no ABNT2 é tecla própria; no US-INTERNATIONAL cai na base c", () => {
    expect(resolveAwaitedKey("ç", null, abnt2)).toBe("ç");
    expect(resolveAwaitedKey("ç", null, usIntl)).toBe("c");
  });

  it("caractere sem tecla correspondente → null", () => {
    expect(resolveAwaitedKey("∑", null, abnt2)).toBeNull();
  });
});
