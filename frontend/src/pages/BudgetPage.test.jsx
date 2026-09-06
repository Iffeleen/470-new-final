import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import BudgetPage from "./BudgetPage";
import { getBudgets, createBudget, updateBudget } from "../services/financeApi";

vi.mock("../services/financeApi");

describe("BudgetPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows loading state on mount", async () => {
    getBudgets.mockResolvedValue({ data: { data: [] } });
    render(<BudgetPage />);
    expect(screen.getByText(/Loading budget data/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText(/Loading budget data/i)).not.toBeInTheDocument();
    });
  });

  test("loads existing budget data and populates inputs", async () => {
    getBudgets.mockResolvedValue({
      data: {
        data: [
          {
            _id: "budget_123",
            name: "Household Budget",
            monthlyAmount: 25000
          }
        ]
      }
    });

    render(<BudgetPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Household Budget")).toBeInTheDocument();
      expect(screen.getByDisplayValue("25000")).toBeInTheDocument();
    });
  });

  test("creates a new budget when none exists yet", async () => {
    const user = userEvent.setup();
    getBudgets.mockResolvedValue({ data: { data: [] } });
    createBudget.mockResolvedValue({ data: { data: { _id: "new_budget_id" } } });

    render(<BudgetPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading budget data/i)).not.toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Budget name/i);
    const amountInput = screen.getByPlaceholderText(/Enter monthly budget amount/i);
    const submitBtn = screen.getByRole("button", { name: /Save \/ Update Budget/i });

    await user.clear(nameInput);
    await user.type(nameInput, "Office Budget");
    await user.type(amountInput, "30000");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(createBudget).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Office Budget",
          monthlyAmount: 30000,
          currency: "BDT",
          category: "Other",
          dueDay: 1
        })
      );
    });

    expect(updateBudget).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Budget saved successfully/i)).toBeInTheDocument();
    });
  });

  test("updates the existing budget when one is already loaded", async () => {
    const user = userEvent.setup();
    getBudgets.mockResolvedValue({
      data: {
        data: [{ _id: "budget_123", name: "Household Budget", monthlyAmount: 25000 }]
      }
    });
    updateBudget.mockResolvedValue({ data: { data: {} } });

    render(<BudgetPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Household Budget")).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText(/Enter monthly budget amount/i);
    const submitBtn = screen.getByRole("button", { name: /Save \/ Update Budget/i });

    await user.clear(amountInput);
    await user.type(amountInput, "27000");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(updateBudget).toHaveBeenCalledWith(
        "budget_123",
        expect.objectContaining({ monthlyAmount: 27000 })
      );
    });

    expect(createBudget).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText(/Budget saved successfully/i)).toBeInTheDocument();
    });
  });

  test("shows error message when save fails", async () => {
    const user = userEvent.setup();
    getBudgets.mockResolvedValue({ data: { data: [] } });
    createBudget.mockRejectedValue(new Error("API Error"));

    render(<BudgetPage />);
    await waitFor(() => {
      expect(screen.queryByText(/Loading budget data/i)).not.toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/Budget name/i);
    const amountInput = screen.getByPlaceholderText(/Enter monthly budget amount/i);
    const submitBtn = screen.getByRole("button", { name: /Save \/ Update Budget/i });

    await user.type(nameInput, "Test");
    await user.type(amountInput, "10000");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Could not save budget/i)).toBeInTheDocument();
    });
  });

  test("shows error message when loading budgets fails", async () => {
    getBudgets.mockRejectedValue(new Error("Network error"));

    render(<BudgetPage />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load budget data/i)).toBeInTheDocument();
    });
  });
});