import { describe, expect, it } from "vitest";
import { ticketsForBalance } from "./tickets";

describe("ticketsForBalance", () => {
  it("gives 1 ticket per $100, rounded down (owner-confirmed examples)", () => {
    expect(ticketsForBalance(99)).toEqual({ eligible: false, tickets: 0 }); // $99 = not eligible
    expect(ticketsForBalance(100)).toEqual({ eligible: true, tickets: 1 });
    expect(ticketsForBalance(199.99)).toEqual({ eligible: true, tickets: 1 });
    expect(ticketsForBalance(250)).toEqual({ eligible: true, tickets: 2 }); // $250 = 2
    expect(ticketsForBalance(999.99)).toEqual({ eligible: true, tickets: 9 });
  });

  it("caps at 10 tickets from $1,000", () => {
    expect(ticketsForBalance(1000)).toEqual({ eligible: true, tickets: 10 });
    expect(ticketsForBalance(250000)).toEqual({ eligible: true, tickets: 10 });
  });

  it("treats zero, negative and unreadable balances as not eligible", () => {
    for (const bad of [0, -50, NaN, Infinity * -1]) expect(ticketsForBalance(bad)).toEqual({ eligible: false, tickets: 0 });
  });
});
