import { TaskType } from "../task";
import { Capability } from "../agent";

export function taskTypeToCapability(
    taskType: TaskType,
): Capability {

    switch (taskType) {

        case TaskType.RESEARCH:
            return Capability.RESEARCH;

        case TaskType.OUTREACH:
            return Capability.OUTREACH;

        case TaskType.PROPOSAL:
            return Capability.PROPOSAL;

        case TaskType.DEVELOPMENT:
            return Capability.DEVELOPMENT;

        case TaskType.SUPPORT:
            return Capability.SUPPORT;

    }

}