import matplotlib.pyplot as plt

splits = ["Training", "Validation", "Testing"]
same_underlying = [17, 5, 9]
related_different = [8, 3, 3]
unrelated = [9, 2, 3]
totals = [s + r + u for s, r, u in zip(same_underlying, related_different, unrelated)]

fig, ax = plt.subplots(figsize=(8, 5))

b1 = ax.bar(splits, same_underlying, label="Same Underlying", color="#2e8b57")
b2 = ax.bar(splits, related_different, bottom=same_underlying, label="Related but Different", color="#f4a236")
bottom_u = [s + r for s, r in zip(same_underlying, related_different)]
b3 = ax.bar(splits, unrelated, bottom=bottom_u, label="Unrelated", color="#d63230")

for i in range(len(splits)):
    ax.text(i, same_underlying[i] / 2, str(same_underlying[i]), ha="center", va="center", color="white", fontweight="bold")
    ax.text(i, same_underlying[i] + related_different[i] / 2, str(related_different[i]), ha="center", va="center", color="black", fontweight="bold")
    ax.text(i, bottom_u[i] + unrelated[i] / 2, str(unrelated[i]), ha="center", va="center", color="white", fontweight="bold")
    ax.text(i, totals[i] + 0.8, str(totals[i]), ha="center", va="bottom", color="black", fontweight="bold")

ax.set_title("Problem Pair Dataset Distribution by Split and Label")
ax.set_xlabel("Dataset Split")
ax.set_ylabel("Number of Problem Pairs")
ax.set_ylim(0, max(totals) + 5)
ax.legend()
plt.tight_layout()
plt.savefig("dataset_distribution.png", dpi=300)