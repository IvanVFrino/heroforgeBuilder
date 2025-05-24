

import React, { useState, useEffect, useCallback } from 'react';
import { CharacterData, Race, Subrace, CharClass, Background, AbilityScores, ABILITY_NAMES, Ability, Skill, CommonGameData, AppView, AiCharacterSaveDestination, HeroForgeSessionData, AbilityScoreAssignmentMethod } from './types';
import { generateBackstory, suggestCharacterNames } from './services/geminiService';
import { generateCharacterId } from './services/localStorageService'; 
import AbilityScoreAllocator from './components/AbilityScoreAllocator';
import CharacterSheetDisplay from './components/CharacterSheetDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import MainMenu from './components/MainMenu';
import CharacterGallery from './components/CharacterGallery';
import Bestiary from './components/Bestiary';
import AIContentStudio from './components/AIContentStudio';
import InitialLoadView from './components/InitialLoadView';
import { POINT_BUY_CONFIG, MANUAL_ROLL_CONFIG, DEFAULT_SCORES_FOR_MANUAL_ROLL, DEFAULT_SCORES_FOR_POINT_BUY } from './constants';


const TOTAL_CREATION_STEPS = 7;
const DEFAULT_IMAGE_URL = 'https://via.placeholder.com/300x400/a29bfe/FFFFFF?text=Hero';
const APP_VERSION = "1.0.0"; // For session data versioning

const getAbilityModifier = (score: number): number => Math.floor((score - 10) / 2);

const calculateFinalAbilityScores = (baseScores: AbilityScores, racialBonuses?: Partial<AbilityScores>): AbilityScores => {
  const finalScores = { ...baseScores } as AbilityScores;
  if (racialBonuses) {
    for (const ability of ABILITY_NAMES) {
      const abilityKey = ability as Ability;
      finalScores[abilityKey] = (baseScores[abilityKey] || 0) + (racialBonuses[abilityKey] || 0);
    }
  }
  return finalScores;
};

const mergeRaceAndSubrace = (baseRace: Race, subrace: Subrace): Race => {
  const mergedBonuses = { ...baseRace.abilityScoreBonuses };
  for (const key in subrace.abilityScoreBonuses) {
    const ability = key as Ability;
    mergedBonuses[ability] = (mergedBonuses[ability] || 0) + (subrace.abilityScoreBonuses[ability] || 0);
  }
  const mergedTraits = [...new Set([...baseRace.traits, ...subrace.traits])];
  return {
    ...baseRace,
    name: `${baseRace.name} (${subrace.name})`,
    description: subrace.description || baseRace.description,
    abilityScoreBonuses: mergedBonuses,
    traits: mergedTraits,
    hasPerceptionProficiencyTrait: baseRace.hasPerceptionProficiencyTrait,
    source: baseRace.source, 
  };
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('initialLoad'); // Start with initial load
  const [currentCreationStep, setCurrentCreationStep] = useState(1);
  
  const [baseRacesData, setBaseRacesData] = useState<Race[]>([]);
  const [baseClassesData, setBaseClassesData] = useState<CharClass[]>([]);
  const [baseBackgroundsData, setBaseBackgroundsData] = useState<Background[]>([]);
  
  const [aiRacesData, setAiRacesData] = useState<Race[]>([]);
  const [aiClassesData, setAiClassesData] = useState<CharClass[]>([]);
  const [aiBackgroundsData, setAiBackgroundsData] = useState<Background[]>([]);
  const [aiBestiaryEntries, setAiBestiaryEntries] = useState<CharacterData[]>([]);

  const [racesData, setRacesData] = useState<Race[]>([]);
  const [classesData, setClassesData] = useState<CharClass[]>([]);
  const [backgroundsData, setBackgroundsData] = useState<Background[]>([]);

  const [alignmentsData, setAlignmentsData] = useState<string[]>([]);
  const [skillsData, setSkillsData] = useState<Skill[]>([]);
  const [commonData, setCommonData] = useState<CommonGameData | null>(null);
  
  const [character, setCharacter] = useState<CharacterData>(createInitialCharacterData());
  const [abilityScoreAssignmentMethod, setAbilityScoreAssignmentMethod] = useState<AbilityScoreAssignmentMethod>('standardArray');


  const [savedCharacters, setSavedCharacters] = useState<CharacterData[]>([]); 
  const [selectedCharacterForView, setSelectedCharacterForView] = useState<CharacterData | null>(null);

  const [isLoadingStaticData, setIsLoadingStaticData] = useState(true); // For fetching common.json etc.
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [selectedSkillChoices, setSelectedSkillChoices] = useState<string[]>([]);
  const [selectedBaseRaceForSubChoice, setSelectedBaseRaceForSubChoice] = useState<Race | null>(null);

  function createInitialCharacterData(cData?: CommonGameData): CharacterData {
    const effectiveCommonData = cData || commonData;
    return {
      id: generateCharacterId(), 
      name: '',
      level: 1,
      abilityScores: effectiveCommonData ? { ...effectiveCommonData.DEFAULT_ABILITY_SCORES } : { Strength: 0, Dexterity: 0, Constitution: 0, Intelligence: 0, Wisdom: 0, Charisma: 0 }, // All 0s initially
      finalAbilityScores: effectiveCommonData ? { ...effectiveCommonData.DEFAULT_ABILITY_SCORES } : { Strength: 0, Dexterity: 0, Constitution: 0, Intelligence: 0, Wisdom: 0, Charisma: 0 },
      availableScores: effectiveCommonData ? [...effectiveCommonData.STANDARD_ARRAY_SCORES].sort((a,b) => b-a) : [],
      proficientSkills: [],
      proficientSavingThrows: [],
      backstory: '',
      imageUrl: '',
      proficiencyBonus: effectiveCommonData ? effectiveCommonData.PROFICIENCY_BONUS_LEVEL_1 : 2,
    };
  }
  
  // Load static game data (non-user specific)
  useEffect(() => {
    const loadStaticGameData = async () => {
      setIsLoadingStaticData(true);
      try {
        const [racesRes, classesRes, backgroundsRes, skillsRes, alignmentsRes, commonRes] = await Promise.all([
          fetch('public/data/races.json').then(res => res.json()),
          fetch('public/data/classes.json').then(res => res.json()),
          fetch('public/data/backgrounds.json').then(res => res.json()),
          fetch('public/data/skills.json').then(res => res.json()),
          fetch('public/data/alignments.json').then(res => res.json()),
          fetch('public/data/common.json').then(res => res.json()),
        ]);

        setBaseRacesData(racesRes.map((r: Race) => ({ ...r, source: 'base' })));
        setBaseClassesData(classesRes.map((c: CharClass) => ({ ...c, source: 'base' })));
        setBaseBackgroundsData(backgroundsRes.map((b: Background) => ({ ...b, source: 'base' })));
        
        setSkillsData(skillsRes);
        setAlignmentsData(alignmentsRes);
        const loadedCommonData = commonRes as CommonGameData;
        setCommonData(loadedCommonData);
        
        setCharacter(createInitialCharacterData(loadedCommonData)); 

      } catch (error) {
        console.error("Failed to load static game data:", error);
        setApiError("Failed to load essential game data. Please refresh the page.");
      }
      setIsLoadingStaticData(false);
    };
    loadStaticGameData();
  }, []);

  const initializeWithFreshData = () => {
    setSavedCharacters([]);
    setAiRacesData([]);
    setAiClassesData([]);
    setAiBackgroundsData([]);
    setAiBestiaryEntries([]);
    if(commonData) resetCreator(commonData); // Reset creator state as well
    setCurrentView('menu');
  };

  const handleSessionDataLoaded = (data: HeroForgeSessionData) => {
    setSavedCharacters(data.savedCharacters.map(c => ({...c, source: c.source || 'pc-gallery-ai'})) || []); 
    setAiRacesData(data.aiGeneratedRaces.map(r => ({...r, source: 'user-ai'})) || []);
    setAiClassesData(data.aiGeneratedClasses.map(c => ({...c, source: 'user-ai'})) || []);
    setAiBackgroundsData(data.aiGeneratedBackgrounds.map(b => ({...b, source: 'user-ai'})) || []);
    setAiBestiaryEntries(data.aiGeneratedBestiaryEntries.map(e => ({...e, source: 'bestiary-ai'})) || []);
    if(commonData) resetCreator(commonData); // Reset any in-progress character
    setCurrentView('menu');
  };

  useEffect(() => { setRacesData([...baseRacesData, ...aiRacesData]); }, [baseRacesData, aiRacesData]);
  useEffect(() => { setClassesData([...baseClassesData, ...aiClassesData]); }, [baseClassesData, aiClassesData]);
  useEffect(() => { setBackgroundsData([...baseBackgroundsData, ...aiBackgroundsData]); }, [baseBackgroundsData, aiBackgroundsData]);
  
  useEffect(() => {
    if (!commonData) return;

    const newFinalScores = calculateFinalAbilityScores(character.abilityScores, character.race?.abilityScoreBonuses);
    let hp = character.charClass ? character.charClass.hitDie + getAbilityModifier(newFinalScores.Constitution) : (character.hitPoints || 0);
    if (character.race?.name?.toLowerCase().includes("hill dwarf")) { // Dwarven Toughness for Hill Dwarf
        hp += character.level;
    }
    let ac = character.armorClass || (10 + getAbilityModifier(newFinalScores.Dexterity));
    const proficientSavingThrows = character.charClass?.savingThrowProficiencies || character.proficientSavingThrows || [];
    
    let allProficientSkills: string[] = []; // Start fresh to avoid duplicates if background/class changes
    if (character.race?.hasPerceptionProficiencyTrait) { // e.g. Keen Senses for Elves
      allProficientSkills.push("Perception");
    }
    if (character.background) {
      allProficientSkills.push(...character.background.skillProficiencies);
    }
    allProficientSkills.push(...selectedSkillChoices); // From class selection
    
    // Ensure selected skills from class don't duplicate background/race ones before adding to character
    const uniqueProficientSkills = [...new Set(allProficientSkills)];


    setCharacter(prev => ({
      ...prev,
      finalAbilityScores: newFinalScores,
      hitPoints: hp,
      armorClass: ac,
      proficientSavingThrows: proficientSavingThrows,
      proficientSkills: uniqueProficientSkills,
      proficiencyBonus: prev.proficiencyBonus || commonData.PROFICIENCY_BONUS_LEVEL_1,
    }));
  }, [character.abilityScores, character.race, character.charClass, character.background, selectedSkillChoices, commonData, character.level, character.hitPoints, character.armorClass]); // Added character.level for HP recalc for Hill Dwarf

  const updateCharacter = useCallback(<K extends keyof CharacterData>(key: K, value: CharacterData[K]) => {
    setCharacter(prev => ({ ...prev, [key]: value }));
  }, []);

  const downloadJson = (data: any, filename: string) => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCharacter = () => {
    if (!character.race || !character.charClass || !character.background) {
      alert("Please complete all core selections (Race, Class, Background) before saving.");
      return;
    }
    // Validate ability scores one last time based on method
    if (abilityScoreAssignmentMethod === 'standardArray' && character.availableScores.length > 0) {
      alert("Standard Array: Please assign all standard array ability scores before saving."); return;
    }
    if (abilityScoreAssignmentMethod === 'manualRoll') {
      const scores = Object.values(character.abilityScores);
      if (scores.some(s => s < MANUAL_ROLL_CONFIG.minScore || s > MANUAL_ROLL_CONFIG.maxScore || s === 0 )) {
         alert(`Manual Entry: All ability scores must be between ${MANUAL_ROLL_CONFIG.minScore} and ${MANUAL_ROLL_CONFIG.maxScore}.`); return;
      }
    }
     if (abilityScoreAssignmentMethod === 'pointBuy') {
      const scores = Object.values(character.abilityScores);
      if (scores.some(s => s < POINT_BUY_CONFIG.minScore || s > POINT_BUY_CONFIG.maxScore )) {
         alert(`Point Buy: All base ability scores must be between ${POINT_BUY_CONFIG.minScore} and ${POINT_BUY_CONFIG.maxScore}.`); return;
      }
    }


    const characterToSave: CharacterData = {
      ...character,
      imageUrl: character.imageUrl || DEFAULT_IMAGE_URL,
      source: 'pc-gallery-ai' 
    };
    
    const filename = `${characterToSave.name.replace(/\s+/g, '_') || 'character'}_${characterToSave.id}.json`;
    downloadJson(characterToSave, filename);
    
    setSavedCharacters(prev => [...prev, characterToSave]); 
    alert(`${characterToSave.name || "Character"} data prepared for download as ${filename}. Also added to current session gallery.`);
    setCurrentView('gallery');
    resetCreator(); // Reset after saving
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (window.confirm("Are you sure you want to remove this character from the current gallery session? This won't delete any downloaded files. Remember to save your session if you want this removal to persist.")) {
      setSavedCharacters(prev => prev.filter(c => c.id !== characterId));
      if (selectedCharacterForView?.id === characterId) {
        setSelectedCharacterForView(null);
      }
    }
  };
  
  const handleViewCharacterSheet = (char: CharacterData) => {
    setSelectedCharacterForView(char);
    setCurrentView('viewCharacterSheet');
  };

  const handleRaceSelection = (race: Race) => {
    if (race.subraces && race.subraces.length > 0) {
      setSelectedBaseRaceForSubChoice(race);
      updateCharacter('race', undefined); // Clear current race selection
    } else {
      updateCharacter('race', race);
      setSelectedBaseRaceForSubChoice(null);
    }
  };

  const handleSubraceSelection = (subrace: Subrace) => {
    if (selectedBaseRaceForSubChoice) {
      const finalRace = mergeRaceAndSubrace(selectedBaseRaceForSubChoice, subrace);
      updateCharacter('race', finalRace);
      setSelectedBaseRaceForSubChoice(null);
    }
  };

  const handleAbilityScoresUpdate = useCallback((newScores: AbilityScores, remainingStandardScores: number[]) => {
    setCharacter(prev => ({ ...prev, abilityScores: newScores, availableScores: remainingStandardScores }));
  }, []);

  const handleAbilityScoreMethodChange = (newMethod: AbilityScoreAssignmentMethod) => {
    if (!commonData) return;
    setAbilityScoreAssignmentMethod(newMethod);
    
    let baseScoresToSet: AbilityScores;
    let availableScoresToSet: number[] = [];

    if (newMethod === 'standardArray') {
      baseScoresToSet = { ...commonData.DEFAULT_ABILITY_SCORES }; // All 0s
      availableScoresToSet = [...commonData.STANDARD_ARRAY_SCORES].sort((a,b) => b-a);
    } else if (newMethod === 'pointBuy') {
      baseScoresToSet = { ...DEFAULT_SCORES_FOR_POINT_BUY }; // All 8s
    } else { // manualRoll
      baseScoresToSet = { ...DEFAULT_SCORES_FOR_MANUAL_ROLL }; // All 10s
    }
    setCharacter(prev => ({
      ...prev,
      abilityScores: baseScoresToSet,
      availableScores: availableScoresToSet,
    }));
  };

  const handleGenerateBackstory = async () => {
    if (!character.race || !character.charClass || !character.background || !character.alignment) {
      setApiError("Please select race, class, background, and alignment first."); return;
    }
    setIsLoadingAI(true); setApiError(null);
    const backstory = await generateBackstory(character.race, character.charClass, character.background, character.alignment, character.name || "This character");
    updateCharacter('backstory', backstory); setIsLoadingAI(false);
    if (backstory.startsWith("Error") || backstory.startsWith("Gemini API key not configured")) setApiError(backstory);
  };

  const handleSuggestNames = async () => {
    if (!character.race || !character.charClass) { setApiError("Please select race and class first."); return; }
    setIsLoadingAI(true); setApiError(null);
    const names = await suggestCharacterNames(character.race, character.charClass);
    setSuggestedNames(names); setIsLoadingAI(false);
    if (names.length > 0 && (names[0].startsWith("Error") || names[0].startsWith("Name suggestion unavailable"))) setApiError(names[0]);
  };

  const handleSkillChoice = (skillName: string) => {
    if (!character.charClass) return;
    const maxChoices = character.charClass.skillProficiencies.choose;
    setSelectedSkillChoices(prev => {
      if (prev.includes(skillName)) return prev.filter(s => s !== skillName);
      else if (prev.length < maxChoices) return [...prev, skillName];
      return prev;
    });
  };
  
  const nextCreationStep = () => {
    if (currentCreationStep === 1 && !character.race) { alert("Please select a race (and subrace, if applicable)."); return; }
    if (currentCreationStep === 3) { // Ability Scores Validation
        if (abilityScoreAssignmentMethod === 'standardArray' && character.availableScores.length > 0) {
            alert("Standard Array: Please assign all standard array ability scores."); return;
        }
        if (abilityScoreAssignmentMethod === 'manualRoll') {
            const scores = Object.values(character.abilityScores);
            if (scores.some(s => s < MANUAL_ROLL_CONFIG.minScore || s > MANUAL_ROLL_CONFIG.maxScore || s === 0)) { // Check for 0 as unentered
                alert(`Manual Entry: All ability scores must be entered and be between ${MANUAL_ROLL_CONFIG.minScore} and ${MANUAL_ROLL_CONFIG.maxScore}.`); return;
            }
        }
        if (abilityScoreAssignmentMethod === 'pointBuy') {
            const scores = Object.values(character.abilityScores);
             if (scores.some(s => s < POINT_BUY_CONFIG.minScore || s > POINT_BUY_CONFIG.maxScore )) {
                 alert(`Point Buy: All base ability scores must be between ${POINT_BUY_CONFIG.minScore} and ${POINT_BUY_CONFIG.maxScore}.`); return;
            }
            // Optionally, check if all points are spent or if that's allowed. For now, allow proceeding.
        }
    }
    if (currentCreationStep === 4 && character.charClass && selectedSkillChoices.length < character.charClass.skillProficiencies.choose && character.charClass.skillProficiencies.choose > 0) {
      alert(`Please select ${character.charClass.skillProficiencies.choose} skill proficiencies.`); return;
    }
    setCurrentCreationStep(s => Math.min(s + 1, TOTAL_CREATION_STEPS));
  };
  const prevCreationStep = () => {
    if (currentCreationStep === 1) {
      resetCreator(); 
      setCurrentView('menu'); 
    } else {
      setCurrentCreationStep(s => Math.max(s - 1, 1));
    }
  };

  const resetCreator = useCallback((cDataOverride?: CommonGameData) => {
    const effectiveCommonData = cDataOverride || commonData;
    if (!effectiveCommonData) return;
    setCharacter(createInitialCharacterData(effectiveCommonData)); 
    setSelectedSkillChoices([]);
    setSuggestedNames([]);
    setApiError(null);
    setSelectedBaseRaceForSubChoice(null);
    setAbilityScoreAssignmentMethod('standardArray'); // Reset method
    setCurrentCreationStep(1);
  }, [commonData]);

  const navigateToCreation = () => {
    resetCreator();
    setCurrentView('creation');
  };

  const handleLoadCharactersFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsedData = JSON.parse(text);
        const charactersToLoad: CharacterData[] = [];

        if (Array.isArray(parsedData)) {
          if (parsedData.every(item => typeof item === 'object' && item !== null && 'id' in item && 'name' in item)) {
             charactersToLoad.push(...parsedData as CharacterData[]);
          } else {
            throw new Error("File contains an array, but not all items are valid characters.");
          }
        } else if (typeof parsedData === 'object' && parsedData !== null && 'id' in parsedData && 'name' in parsedData) {
          charactersToLoad.push(parsedData as CharacterData);
        } else {
          throw new Error("Invalid JSON format. Expected a character object or an array of characters.");
        }
        
        const finalCharacters = charactersToLoad.map(c => ({...c, source: c.source || 'pc-gallery-ai'}));
        setSavedCharacters(prev => [...prev, ...finalCharacters]);
        alert(`${finalCharacters.length} character(s) loaded and added to the gallery for this session. Remember to save your session to persist this change.`);

      } catch (err: any) {
        console.error("Error loading characters from file:", err);
        alert(`Failed to load characters: ${err.message}`);
      }
    };
    reader.onerror = () => { alert("Error reading file."); };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleExportAllGalleryCharacters = () => {
    if (savedCharacters.length === 0) {
      alert("No characters in the current gallery session to export.");
      return;
    }
    downloadJson(savedCharacters, "heroforge_gallery_export.json");
    alert(`${savedCharacters.length} characters from the current gallery session prepared for download.`);
  };

  const handleExportSessionData = () => {
    const sessionData: HeroForgeSessionData = {
      version: APP_VERSION,
      savedCharacters: savedCharacters,
      aiGeneratedRaces: aiRacesData.map(({source, ...rest}) => rest) as Race[], 
      aiGeneratedClasses: aiClassesData.map(({source, ...rest}) => rest) as CharClass[],
      aiGeneratedBackgrounds: aiBackgroundsData.map(({source, ...rest}) => rest) as Background[],
      aiGeneratedBestiaryEntries: aiBestiaryEntries, 
    };
    downloadJson(sessionData, `HeroForge_Session_${new Date().toISOString().slice(0,10)}.json`);
    alert("All session data prepared for download. Save this file to restore your session later.");
  };


  // --- AI Content Studio Callbacks ---
  const handleSaveNewRace = (newRace: Race) => {
    const raceWithSource = {...newRace, source: 'user-ai' as 'user-ai'};
    setAiRacesData(prev => {
        const existingIndex = prev.findIndex(r => r.name === raceWithSource.name);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = raceWithSource;
            return updated;
        }
        return [...prev, raceWithSource];
    });
    alert(`Race "${newRace.name}" added to session! It's now available in character creation. Remember to save your session to persist this change.`);
  };
  const handleSaveNewClass = (newClass: CharClass) => {
    const classWithSource = {...newClass, source: 'user-ai' as 'user-ai'};
    setAiClassesData(prev => {
        const existingIndex = prev.findIndex(c => c.name === classWithSource.name);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = classWithSource;
            return updated;
        }
        return [...prev, classWithSource];
    });
     alert(`Class "${newClass.name}" added to session! It's now available in character creation. Remember to save your session to persist this change.`);
  };
  const handleSaveNewBackground = (newBackground: Background) => {
    const backgroundWithSource = {...newBackground, source: 'user-ai' as 'user-ai'};
    setAiBackgroundsData(prev => {
        const existingIndex = prev.findIndex(b => b.name === backgroundWithSource.name);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = backgroundWithSource;
            return updated;
        }
        return [...prev, backgroundWithSource];
    });
     alert(`Background "${newBackground.name}" added to session! It's now available in character creation. Remember to save your session to persist this change.`);
  };
  const handleSaveNewAiCharacter = (newCharData: CharacterData, destination: AiCharacterSaveDestination) => {
    const characterWithId = { ...newCharData, id: newCharData.id || generateCharacterId() };
    if (destination === 'bestiary') {
      const entryWithSource = {...characterWithId, source: 'bestiary-ai' as 'bestiary-ai'};
      setAiBestiaryEntries(prev => {
          const existingIndex = prev.findIndex(e => e.id === entryWithSource.id);
          if (existingIndex > -1) {
              const updated = [...prev];
              updated[existingIndex] = entryWithSource;
              return updated;
          }
          return [...prev, entryWithSource];
      });
      alert(`"${entryWithSource.name}" added to Bestiary for this session! Remember to save your session to persist this change.`);
    } else { // 'gallery'
      const characterToDownload: CharacterData = {
        ...characterWithId,
        imageUrl: characterWithId.imageUrl || DEFAULT_IMAGE_URL,
        source: 'pc-gallery-ai'
      };
      const filename = `${characterToDownload.name.replace(/\s+/g, '_') || 'ai_character'}_${characterToDownload.id}.json`;
      downloadJson(characterToDownload, filename); 
      setSavedCharacters(prev => [...prev, characterToDownload]);
      alert(`AI Character "${characterToDownload.name}" data prepared for download as ${filename}. Also added to current session gallery. Remember to save your session to persist this change.`);
    }
  };


  if (isLoadingStaticData || (currentView !== 'initialLoad' && !commonData)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <LoadingSpinner size="lg" message="Forging the anvils... loading core data..." />
      </div>
    );
  }
  
  if (currentView === 'initialLoad') {
    return <InitialLoadView onDataLoaded={handleSessionDataLoaded} onStartFresh={initializeWithFreshData} />;
  }

  const renderCreationStepContent = () => {
    switch (currentCreationStep) {
        case 1: 
        if (selectedBaseRaceForSubChoice) {
          return (
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-slate-700 mb-2">Choose Subrace for {selectedBaseRaceForSubChoice.name}</h2>
              <p className="text-slate-600 mb-6">{selectedBaseRaceForSubChoice.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedBaseRaceForSubChoice.subraces?.map(sub => (
                  <div key={sub.name}
                       className={`p-6 rounded-xl shadow-lg border-4 transition-all duration-200 cursor-pointer hover:shadow-xl bg-white hover:border-orange-400`}
                       onClick={() => handleSubraceSelection(sub)}>
                    <h3 className="text-xl font-semibold text-slate-800">{sub.name}</h3>
                    {sub.description && <p className="text-sm text-slate-600 mt-1 mb-2">{sub.description}</p>}
                    <div className="mt-2 text-xs text-slate-500">
                      <p>Bonuses: {Object.entries(sub.abilityScoreBonuses).map(([key, val]) => `${key} +${val}`).join(', ')}</p>
                      <p className="mt-1">Traits: {sub.traits.join(', ')}</p>
                    </div>
                  </div>
                ))}
              </div>
               <button onClick={() => setSelectedBaseRaceForSubChoice(null)} className="mt-6 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Races</button>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Choose Your Race</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {racesData.map(r => (
                <div key={r.name} 
                     className={`p-6 rounded-xl shadow-lg border-4 transition-all duration-200 cursor-pointer hover:shadow-xl ${character.race?.name === r.name || character.race?.name?.startsWith(r.name + " (") ? 'border-orange-500 bg-orange-50 scale-105' : 'border-gray-300 bg-white hover:border-orange-400'}`}
                     onClick={() => handleRaceSelection(r)}>
                  <div className="flex items-center mb-3">
                    {r.icon && <span className="text-4xl mr-3">{r.icon}</span>}
                    <h3 className="text-2xl font-semibold text-slate-800">{r.name} {r.source === 'user-ai' && <span className="text-xs text-indigo-500">(AI/Custom)</span>}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{r.description}</p>
                  {(character.race?.name === r.name || character.race?.name?.startsWith(r.name + " (") )&& character.race && (
                    <div className="mt-3 text-xs text-slate-500">
                      <p className="font-semibold">Bonuses: {Object.entries(character.race.abilityScoreBonuses).map(([key, val]) => `${key} +${val}`).join(', ')}</p>
                      <p className="mt-1 font-semibold">Traits: {character.race.traits.join(', ')}</p>
                    </div>
                  )}
                   {r.subraces && r.subraces.length > 0 && !(character.race?.name?.startsWith(r.name + " (") ) && (
                     <p className="mt-2 text-sm text-blue-600 font-semibold">Has subraces - click to choose.</p>
                   )}
                </div>
              ))}
            </div>
          </div>
        );
      case 2: 
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Choose Your Class</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classesData.map(c => (
                <div key={c.name} 
                     className={`p-6 rounded-xl shadow-lg border-4 transition-all duration-200 cursor-pointer hover:shadow-xl ${character.charClass?.name === c.name ? 'border-orange-500 bg-orange-50 scale-105' : 'border-gray-300 bg-white hover:border-orange-400'}`}
                     onClick={() => { updateCharacter('charClass', c); setSelectedSkillChoices([]); }}>
                  <div className="flex items-center mb-3">
                     {c.icon && <span className="text-4xl mr-3">{c.icon}</span>}
                    <h3 className="text-2xl font-semibold text-slate-800">{c.name} {c.source === 'user-ai' && <span className="text-xs text-indigo-500">(AI/Custom)</span>}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{c.description}</p>
                  {character.charClass?.name === c.name && (
                    <div className="mt-3 text-xs text-slate-500">
                      <p><span className="font-semibold">Hit Die:</span> d{c.hitDie}</p>
                      <p><span className="font-semibold">Saving Throws:</span> {c.savingThrowProficiencies.join(', ')}</p>
                      <p><span className="font-semibold">Armor:</span> {c.armorProficiencies.join(', ') || "None"}</p>
                      <p><span className="font-semibold">Weapons:</span> {c.weaponProficiencies.join(', ')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 3: 
        if (!commonData) return <LoadingSpinner/>
        return (
            <div>
                 <h2 className="text-3xl font-bold text-slate-700 mb-4">Asignar Puntuaciones de Habilidad</h2>
                <div className="mb-6 p-3 bg-gray-100 rounded-md border border-gray-300">
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Elegir Método de Asignación:</h3>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {(['standardArray', 'pointBuy', 'manualRoll'] as AbilityScoreAssignmentMethod[]).map(methodVal => (
                            <label key={methodVal} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="abilityScoreMethod"
                                    value={methodVal}
                                    checked={abilityScoreAssignmentMethod === methodVal}
                                    onChange={() => handleAbilityScoreMethodChange(methodVal)}
                                    className="form-radio h-4 w-4 text-orange-600 border-gray-400 focus:ring-orange-500"
                                />
                                <span className="text-slate-700">
                                    {methodVal === 'standardArray' && 'Standard Array'}
                                    {methodVal === 'pointBuy' && 'Point Buy'}
                                    {methodVal === 'manualRoll' && 'Manual / Tirada'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <AbilityScoreAllocator 
                    initialScores={character.abilityScores} 
                    racialBonuses={character.race?.abilityScoreBonuses || {}}
                    availableStandardScores={character.availableScores} // Only used by standard array method
                    standardArray={commonData.STANDARD_ARRAY_SCORES}
                    onScoresUpdate={handleAbilityScoresUpdate} 
                    method={abilityScoreAssignmentMethod}
                    pointBuyConfig={POINT_BUY_CONFIG}
                />
            </div>
        );
      case 4: 
        if (!character.charClass) { return <p>Please select a class first to see skill options.</p>; }
        if (character.charClass.skillProficiencies.choose === 0) {
            // Automatically advance if no choices. Use setTimeout to avoid issues with state updates during render.
            if (currentCreationStep === 4) setTimeout(() => setCurrentCreationStep(5), 0); 
            return <p>No skills to choose for this class. Moving to next step...</p>;
        }
        const { choose, options } = character.charClass.skillProficiencies;
        return (
          <div className="space-y-4 p-4 bg-white shadow-md rounded-lg border border-gray-300">
            <h2 className="text-3xl font-bold text-slate-700 mb-2">Class Skill Proficiencies</h2>
            <p className="text-slate-600 mb-4">Choose {choose} skill(s) from the following options for your {character.charClass.name}:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {options.map(skillName => (
                <label key={skillName} className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${selectedSkillChoices.includes(skillName) ? 'bg-orange-100 border-orange-500' : 'bg-gray-50 border-gray-300 hover:bg-orange-50'}`}>
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-5 w-5 text-orange-600 rounded border-gray-400 focus:ring-orange-500"
                    checked={selectedSkillChoices.includes(skillName)}
                    onChange={() => handleSkillChoice(skillName)}
                    disabled={!selectedSkillChoices.includes(skillName) && selectedSkillChoices.length >= choose}
                  />
                  <span className="ml-3 text-slate-700">{skillName}</span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-500">Selected: {selectedSkillChoices.length} of {choose}</p>
          </div>
        );
      case 5: 
        return (
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Choose Your Background</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {backgroundsData.map(b => (
                <div key={b.name} 
                     className={`p-6 rounded-xl shadow-lg border-4 transition-all duration-200 cursor-pointer hover:shadow-xl ${character.background?.name === b.name ? 'border-orange-500 bg-orange-50 scale-105' : 'border-gray-300 bg-white hover:border-orange-400'}`}
                     onClick={() => updateCharacter('background', b)}>
                  <div className="flex items-center mb-3">
                    {b.icon && <span className="text-3xl mr-3">{b.icon}</span>}
                    <h3 className="text-2xl font-semibold text-slate-800">{b.name} {b.source === 'user-ai' && <span className="text-xs text-indigo-500">(AI/Custom)</span>}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{b.description}</p>
                  {character.background?.name === b.name && (
                    <div className="mt-3 text-xs text-slate-500">
                      <p><span className="font-semibold">Skills:</span> {b.skillProficiencies.join(', ')}</p>
                      <p><span className="font-semibold">Tools/Lang:</span> {b.toolProficienciesOrLanguages.join(', ')}</p>
                      <p className="mt-1"><span className="font-semibold">Feature:</span> {b.feature.name}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      case 6: 
        return (
          <div className="space-y-6 p-6 bg-white shadow-xl rounded-lg border border-gray-300">
            <h2 className="text-3xl font-bold text-slate-700 mb-6">Final Details</h2>
            <div>
              <label htmlFor="charName" className="block text-lg font-medium text-slate-700 mb-1">Character Name</label>
              <input type="text" id="charName" value={character.name} onChange={e => updateCharacter('name', e.target.value)}
                     className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500" placeholder="e.g., Eldrin Moonwhisper" />
              {character.race && character.charClass && (
                <button onClick={handleSuggestNames} disabled={isLoadingAI}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors text-sm">
                  {isLoadingAI && apiError === null && !suggestedNames.length ? <LoadingSpinner size="sm" /> : "Suggest Names (AI)"}
                </button>
              )}
              {suggestedNames.length > 0 && !suggestedNames[0].startsWith("Error") && (
                <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <h4 className="font-semibold text-sm text-slate-600 mb-1">Suggested Names:</h4>
                  <ul className="list-disc list-inside text-sm">
                    {suggestedNames.map(name => (
                      <li key={name} className="cursor-pointer hover:text-orange-600" onClick={() => updateCharacter('name', name)}>{name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
             <div>
              <label htmlFor="charImageUrl" className="block text-lg font-medium text-slate-700 mb-1">Character Image URL (Optional)</label>
              <input type="url" id="charImageUrl" value={character.imageUrl || ''} onChange={e => updateCharacter('imageUrl', e.target.value)}
                     className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500" placeholder="https://example.com/your-character.png" />
                {character.imageUrl && <img src={character.imageUrl} alt="Character preview" className="mt-2 rounded-md shadow-sm max-h-40 border border-gray-300" onError={(e) => (e.currentTarget.style.display = 'none')} />}
                {!character.imageUrl && <img src={DEFAULT_IMAGE_URL} alt="Default character preview" className="mt-2 rounded-md shadow-sm max-h-40 opacity-50 border border-gray-300" />}
            </div>
            <div>
              <label htmlFor="alignment" className="block text-lg font-medium text-slate-700 mb-1">Alignment</label>
              <select id="alignment" value={character.alignment || ''} onChange={e => updateCharacter('alignment', e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500">
                <option value="">Select Alignment</option>
                {alignmentsData.map(align => <option key={align} value={align}>{align}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="backstory" className="block text-lg font-medium text-slate-700 mb-1">Backstory</label>
              {character.race && character.charClass && character.background && character.alignment && (
                <button onClick={handleGenerateBackstory} disabled={isLoadingAI}
                        className="mb-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 transition-colors text-sm">
                  {isLoadingAI && apiError === null && !character.backstory ? <LoadingSpinner size="sm" /> : "Generate Backstory (AI)"}
                </button>
              )}
              <textarea id="backstory" value={character.backstory} onChange={e => updateCharacter('backstory', e.target.value)} rows={6}
                        className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Craft your character's history or let AI inspire you..."></textarea>
            </div>
            {isLoadingAI && <LoadingSpinner message="AI is conjuring..."/>}
            {apiError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded-md">{apiError}</p>}
          </div>
        );
      case TOTAL_CREATION_STEPS: 
        if (!character.race || !character.charClass || !character.background) {
            return <div className="p-6 text-center text-xl text-red-600 bg-red-50 rounded-lg shadow-md">Character data incomplete. Please go back.</div>;
        }
        const reviewCharacter = {
            ...character,
            imageUrl: character.imageUrl || DEFAULT_IMAGE_URL 
        };
        return <CharacterSheetDisplay character={reviewCharacter} allSkills={skillsData} />;
      default:
        return <div>Unknown step.</div>;
    }
  };

  const progress = (currentCreationStep / TOTAL_CREATION_STEPS) * 100;

  const renderContent = () => {
    switch (currentView) {
      case 'menu':
        return <MainMenu 
                  onNavigateToCreation={navigateToCreation} 
                  onNavigateToGallery={() => setCurrentView('gallery')} 
                  onNavigateToBestiary={() => setCurrentView('bestiary')}
                  onNavigateToAIStudio={() => setCurrentView('aiContentStudio')} 
                  onExportSessionData={handleExportSessionData}
                />;
      case 'creation':
        return (
          <>
            <div className="mb-8 p-1 bg-gray-300 rounded-full shadow-inner">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
              <p className="text-center text-sm text-slate-600 mt-1">Step {currentCreationStep} of {TOTAL_CREATION_STEPS}</p>
            </div>
            <main className="bg-slate-50 p-6 sm:p-8 rounded-xl shadow-2xl border border-gray-300">
              {isLoadingStaticData ? <LoadingSpinner message="Loading character options..." /> : renderCreationStepContent()}
            </main>
            <footer className="mt-10 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <button onClick={prevCreationStep} 
                      className="px-8 py-3 bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-lg font-medium w-full sm:w-auto">
                {currentCreationStep === 1 ? "Back to Menu" : "Previous"}
              </button>
               <button onClick={() => { resetCreator(); setCurrentView('menu'); }}
                      className="px-6 py-2 bg-red-500 text-white rounded-lg shadow-md hover:bg-red-600 transition-colors text-md font-medium order-first sm:order-none w-full sm:w-auto"
                      aria-label="Cancel character creation and return to menu"
                >
                    Cancelar y Salir
                </button>
              {currentCreationStep === TOTAL_CREATION_STEPS ? (
                 <button onClick={handleSaveCharacter}
                         className="px-8 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors text-lg font-medium w-full sm:w-auto">
                    Save & Download Character
                </button>
              ) : (
                <button onClick={nextCreationStep}
                        className="px-8 py-3 bg-orange-600 text-white rounded-lg shadow-md hover:bg-orange-700 disabled:bg-orange-300 transition-colors text-lg font-medium w-full sm:w-auto">
                  Next
                </button>
              )}
            </footer>
          </>
        );
      case 'gallery':
        return <CharacterGallery 
                  characters={savedCharacters} 
                  onViewCharacter={handleViewCharacterSheet} 
                  onDeleteCharacter={handleDeleteCharacter} 
                  onNavigateToMenu={() => setCurrentView('menu')}
                  onNavigateToCreation={navigateToCreation}
                  onLoadCharacters={handleLoadCharactersFromFile}
                  onExportAllCharacters={handleExportAllGalleryCharacters}
                />;
      case 'bestiary':
        return <Bestiary 
                  entries={aiBestiaryEntries} 
                  onNavigateToMenu={() => setCurrentView('menu')}
                  onViewEntry={handleViewCharacterSheet}
                />;
      case 'aiContentStudio': 
        return <AIContentStudio 
                  onNavigateToMenu={() => setCurrentView('menu')}
                  onSaveRace={handleSaveNewRace}
                  onSaveClass={handleSaveNewClass}
                  onSaveBackground={handleSaveNewBackground}
                  onSaveAiCharacter={handleSaveNewAiCharacter}
                />;
      case 'viewCharacterSheet':
        if (!selectedCharacterForView) {
          setCurrentView('gallery'); 
          return <p>No character selected.</p>;
        }
        return (
          <div className="w-full">
            <CharacterSheetDisplay character={selectedCharacterForView} allSkills={skillsData} />
            <div className="mt-8 flex justify-center space-x-4">
                <button 
                    onClick={() => { 
                        const fromGallery = selectedCharacterForView.source === 'pc-gallery-ai' || savedCharacters.find(c => c.id === selectedCharacterForView.id);
                        setSelectedCharacterForView(null); 
                        setCurrentView(fromGallery ? 'gallery' : 'bestiary'); 
                    }}
                    className="px-6 py-3 bg-slate-600 text-white rounded-lg shadow-md hover:bg-slate-700 transition-colors text-lg font-medium"
                >
                    Back to List
                </button>
                 { (selectedCharacterForView.source === 'pc-gallery-ai' || savedCharacters.find(c => c.id === selectedCharacterForView.id)) &&
                    <button 
                        onClick={() => handleDeleteCharacter(selectedCharacterForView.id)}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-colors text-lg font-medium"
                    >
                        Remove from Session
                    </button>
                 }
            </div>
          </div>
        );
      default:
        return <p>Error: Unknown view.</p>;
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full flex-grow flex flex-col">
        <header className="text-center mb-10">
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight title-font">
            <span className="text-slate-700">Hero</span><span className="text-orange-600">Forge</span>
          </h1>
          {currentView === 'creation' && <p className="mt-2 text-lg text-slate-600">Craft your legendary hero, step by step.</p>}
           {currentView === 'aiContentStudio' && <p className="mt-2 text-lg text-slate-600">Forge new Races, Classes, Backgrounds, or even Characters/NPCs with AI!</p>}
        </header>
        
        <div className="flex-grow">
          {renderContent()}
        </div>

        <p className="text-center text-xs text-slate-500 mt-12 pb-4">
          Ensure your API_KEY environment variable is set for AI features.
          Character data and AI content are managed within your session. Use "Export All Session Data" to save.
        </p>
      </div>
    </div>
  );
};

export default App;
