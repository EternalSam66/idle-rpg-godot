extends Control

@onready var floor_label: Label = $MainWorkspace/SplitLayout/DungeonViewportPanel/DungeonFloorIndicator
@onready var console_output: RichTextLabel = $MainWorkspace/SplitLayout/DungeonViewportPanel/BattleArenaDisplay/LogConsole
@onready var coin_label: Label = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/CoinDisplay
@onready var hire_warrior_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/RosterGrid/WarriorCard/HireWarriorBtn
@onready var hire_mage_btn: Button = $MainWorkspace/SplitLayout/GuildPanel/GuildLayout/RosterGrid/MageCard/HireMageBtn

@onready var dungeon_engine: Node = $DungeonEngine

func _ready() -> void:
	if GameState.adventurers.size() == 0:
		GameState.adventurers.append({
			"classType": "Warrior",
			"level": 1,
			"currentHP": 120,
			"maxHP": 120,
			"atk": 12,
			"def": 8
		})

	dungeon_engine.log_message.connect(_on_dungeon_log_emitted)
	dungeon_engine.floor_cleared.connect(_on_floor_cleared)

	dungeon_engine.start_dungeon_run()
	_update_ui_displays()

func _process(_delta: float) -> void:
	coin_label.text = "Gold: %d" % GameState.coins
	_update_button_states()

func _on_dungeon_log_emitted(text: String) -> void:
	console_output.append_text(text + "\n")
	var scrollbar = console_output.get_v_scroll_bar()
	if scrollbar:
		scrollbar.value = scrollbar.max_value

func _on_floor_cleared(level: int) -> void:
	_update_ui_displays()

func _update_ui_displays() -> void:
	floor_label.text = "Dungeon Floor: %d" % GameState.current_selected_level

func _update_button_states() -> void:
	var has_mage = false
	for hero in GameState.adventurers:
		if hero["classType"] == "Mage":
			has_mage = true
			break

	if has_mage:
		hire_mage_btn.text = "HIRED"
		hire_mage_btn.disabled = true
	elif GameState.coins < GameState.CLASS_RECRUITMENT_COSTS["Mage"]:
		hire_mage_btn.text = "75k Gold Required"
		hire_mage_btn.disabled = true
	elif GameState.adventurers.size() >= GameState.max_party_slots:
		hire_mage_btn.text = "PARTY FULL"
		hire_mage_btn.disabled = true
	else:
		hire_mage_btn.text = "HIRE MAGE"
		hire_mage_btn.disabled = false

func _on_hire_warrior_btn_pressed() -> void:
	pass

func _on_hire_mage_btn_pressed() -> void:
	var cost = GameState.CLASS_RECRUITMENT_COSTS["Mage"]
	if GameState.coins >= cost and GameState.adventurers.size() < GameState.max_party_slots:
		GameState.coins -= cost
		GameState.adventurers.append({
			"classType": "Mage",
			"level": 1,
			"currentHP": 60,
			"maxHP": 60,
			"atk": 22,
			"def": 2
		})
		console_output.append_text("[SYSTEM]: Mage successfully joined the guild roster!\n")
		_update_button_states()
