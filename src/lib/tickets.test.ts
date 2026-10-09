import { describe, expect, it } from "vitest";
import { ticketsForNetDeposit } from "./tickets";

describe("ticketsForNetDeposit", () => {
  it("gives 1 ticket per $100, rounded down (owner-confirmed examples)", () => {
    expect(ticketsForNetDeposit(99)).toEqual({ eligible: false, tickets: 0 }); // $99 = not eligible
    expect(ticketsForNetDeposit(100)).toEqual({ eligible: true, tickets: 1 });
    expect(ticketsForNetDeposit(199.99)).toEqual({ eligible: true, tickets: 1 });
    expect(ticketsForNetDeposit(250)).toEqual({ eligible: true, tickets: 2 }); // $250 = 2
    expect(ticketsForNetDeposit(999.99)).toEqual({ eligible: true, tickets: 9 });
  });

  it("caps at 10 tickets from $1,000", () => {
    expect(ticketsForNetDeposit(1000)).toEqual({ eligible: true, tickets: 10 });
    expect(ticketsForNetDeposit(250000)).toEqual({ eligible: true, tickets: 10 });
  });

  it("treats zero, negative (withdrew more than deposited) and unreadable figures as not eligible", () => {
    for (const bad of [0, -50, NaN, Infinity * -1]) expect(ticketsForNetDeposit(bad)).toEqual({ eligible: false, tickets: 0 });
  });
});
