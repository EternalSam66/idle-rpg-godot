extends Node


var coins: int = 775

var max_cleared_level: int = 0

var current_selected_level: int = 1

var max_party_slots: int = 1

var adventurers: Array[Dictionary] = []

var upgrades: Dictionary = {

    "weapon_drills": 0,

    "offense_tactics": 0,

    "plate_forging": 0,

    "defense_tactics": 0,

    "vitality_core": 0,

    "party_expansion": 0,

    "campfire_kit": 0

}


const CLASS_RECRUITMENT_COSTS: Dictionary = {

    "Warrior": 0,

    "Mage": 75000,

    "Ranger": 2500000,

    "Priest": 100000000

}
